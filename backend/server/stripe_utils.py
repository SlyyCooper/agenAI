import os
from datetime import datetime
import stripe
from fastapi.responses import JSONResponse
from backend.server.firebase_init import db
from backend.server.firestore_init import firestore
import logging

logger = logging.getLogger(__name__)

# Add a set to track processed webhook events
processed_events = set()

def initialize_stripe():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def handle_stripe_webhook(event):
    """Handle Stripe webhook events."""
    # Check for duplicate events
    event_id = event['id']
    if event_id in processed_events:
        logger.info(f"Skipping duplicate event: {event_id}")
        return JSONResponse(content={"status": "skipped", "reason": "duplicate"})
    
    processed_events.add(event_id)
    print(f"Processing Stripe webhook event: {event['type']}")
    try:
        if event['type'] == 'customer.created':
            customer = event['data']['object']
            await handle_customer_created(customer)
        elif event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await fulfill_order(session)
        elif event['type'] == 'invoice.paid':
            invoice = event['data']['object']
            await update_subscription_status(invoice)
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            await handle_subscription_cancellation(subscription)
        elif event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            await handle_payment_success(payment_intent)
        elif event['type'] in ['charge.succeeded', 'charge.updated']:
            # Log but don't process these events
            print(f"Received {event['type']} event")
        else:
            print(f'Unhandled event type {event["type"]}')

        return JSONResponse(content={"status": "success"})
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

async def handle_customer_created(customer):
    """Handle customer.created event."""
    try:
        user_id = customer['metadata'].get('user_id')
        if not user_id:
            logger.warning("No user_id in customer metadata")
            return
            
        user_ref = db.collection('users').document(user_id)
        
        # Update user document with Stripe customer info
        user_ref.update({
            'stripe_customer_id': customer['id'],
            'stripe_created_at': firestore.SERVER_TIMESTAMP,
            'customer_email': customer['email'],
            'last_updated': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Successfully processed customer.created for user {user_id}")
    except Exception as e:
        logger.error(f"Error handling customer.created: {str(e)}")
        raise

async def fulfill_order(session):
    user_id = session['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    transaction = db.transaction()
    
    @transaction.transactional
    def update_in_transaction(transaction):
        # Get current user data within transaction
        user_doc = transaction.get(user_ref)
        if not user_doc.exists:
            raise ValueError(f"User {user_id} not found")
            
        if session['mode'] == 'subscription':
            subscription_id = session['subscription']
            subscription = stripe.Subscription.retrieve(subscription_id)
            current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
            
            transaction.update(user_ref, {
                'subscription_status': 'active',
                'subscription_id': subscription_id,
                'subscription_end_date': current_period_end,
                'product_id': os.getenv("STRIPE_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"),
                'has_access': True,
                'last_updated': firestore.SERVER_TIMESTAMP
            })
        else:
            transaction.update(user_ref, {
                'one_time_purchase': True,
                'purchase_date': firestore.SERVER_TIMESTAMP,
                'product_id': os.getenv("STRIPE_ONETIME_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_ONETIME_PRICE_ID"),
                'has_access': True,
                'last_updated': firestore.SERVER_TIMESTAMP
            })
    
    try:
        update_in_transaction(transaction)
        logger.info(f"Order fulfilled for user {user_id}")
    except Exception as e:
        logger.error(f"Error fulfilling order: {str(e)}")
        raise

async def update_subscription_status(invoice):
    user_id = invoice['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    transaction = db.transaction()
    
    @transaction.transactional
    def update_in_transaction(transaction):
        subscription = stripe.Subscription.retrieve(invoice['subscription'])
        current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
        
        transaction.update(user_ref, {
            'subscription_status': 'active',
            'last_payment_date': firestore.SERVER_TIMESTAMP,
            'subscription_end_date': current_period_end,
            'has_access': True,
            'last_updated': firestore.SERVER_TIMESTAMP
        })
    
    try:
        update_in_transaction(transaction)
        logger.info(f"Subscription updated for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise

async def handle_subscription_cancellation(subscription):
    user_id = subscription['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    user_ref.update({
        'subscription_status': 'cancelled',
        'subscription_end_date': datetime.fromtimestamp(subscription['current_period_end']),
        'has_access': False
    })
    
    print(f"Subscription cancelled for user {user_id}")

async def handle_payment_success(payment_intent):
    """Handle successful payment intent"""
    if 'metadata' in payment_intent and 'user_id' in payment_intent['metadata']:
        user_id = payment_intent['metadata']['user_id']
        user_ref = db.collection('users').document(user_id)
        
        # Update payment history
        user_ref.update({
            'last_payment_date': firestore.SERVER_TIMESTAMP,
            'last_payment_amount': payment_intent['amount'] / 100,
            'payment_status': 'succeeded'
        })
