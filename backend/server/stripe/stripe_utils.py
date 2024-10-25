import os
from datetime import datetime
import stripe
from fastapi.responses import JSONResponse
from backend.server.firebase.firebase_init import db
from backend.server.firebase.firestore.firestore_init import firestore
import logging

logger = logging.getLogger(__name__)

# Add a set to track processed webhook events
processed_events = set()

def initialize_stripe():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def handle_stripe_webhook(event):
    """Handle Stripe webhook events."""
    event_id = event['id']
    if event_id in processed_events:
        logger.info(f"Skipping duplicate event: {event_id}")
        return JSONResponse(content={"status": "skipped", "reason": "duplicate"})
    
    processed_events.add(event_id)
    logger.info(f"Processing Stripe webhook event: {event['type']}")
    
    handlers = {
        'customer.created': handle_customer_created,
        'checkout.session.completed': fulfill_order,
        'invoice.paid': update_subscription_status,
        'customer.subscription.deleted': handle_subscription_cancellation,
        'payment_intent.succeeded': handle_payment_success,
        'charge.succeeded': lambda x: logger.info("Received charge.succeeded event"),
        'charge.updated': lambda x: logger.info("Received charge.updated event")
    }
    
    try:
        handler = handlers.get(event['type'])
        if handler:
            await handler(event['data']['object'])
            return JSONResponse(content={"status": "success"})
        else:
            logger.warning(f'Unhandled event type {event["type"]}')
            return JSONResponse(content={"status": "ignored", "reason": "unhandled_event_type"})
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
        user_doc = user_ref.get()
        
        # Only update if document exists
        if user_doc.exists:
            user_ref.update({
                'stripe_customer_id': customer['id'],
                'stripe_created_at': firestore.SERVER_TIMESTAMP,
                'customer_email': customer['email'],
                'last_updated': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Successfully processed customer.created for user {user_id}")
        else:
            # Create new user document if it doesn't exist
            user_ref.set({
                'stripe_customer_id': customer['id'],
                'stripe_created_at': firestore.SERVER_TIMESTAMP,
                'customer_email': customer['email'],
                'created_at': firestore.SERVER_TIMESTAMP,
                'last_updated': firestore.SERVER_TIMESTAMP,
                'has_access': False,
                'one_time_purchase': False
            })
            logger.info(f"Created new user document for {user_id}")
            
    except Exception as e:
        logger.error(f"Error handling customer.created: {str(e)}")
        raise

async def fulfill_order(session):
    user_id = session.get('metadata', {}).get('user_id')
    if not user_id:
        logger.error("No user_id found in session metadata")
        raise ValueError("Missing user_id in session metadata")
        
    user_ref = db.collection('users').document(user_id)
    
    @db.transactional
    def update_in_transaction(transaction, user_ref, session):
        user_doc = user_ref.get(transaction=transaction)
        if not user_doc.exists:
            raise ValueError(f"User {user_id} not found")
            
        # Verify the payment was successful
        if session.get('payment_status') != 'paid':
            raise ValueError("Payment was not successful")

        update_data = {
            'has_access': True,
            'last_updated': firestore.SERVER_TIMESTAMP
        }
            
        if session['mode'] == 'subscription':
            subscription_id = session['subscription']
            subscription = stripe.Subscription.retrieve(subscription_id)
            current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
            
            update_data.update({
                'subscription_status': 'active',
                'subscription_id': subscription_id,
                'subscription_end_date': current_period_end,
                'product_id': os.getenv("STRIPE_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID")
            })
        elif session['mode'] == 'payment':  # Explicitly check for one-time payment
            update_data.update({
                'one_time_purchase': True,
                'purchase_date': firestore.SERVER_TIMESTAMP,
                'product_id': os.getenv("STRIPE_ONETIME_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_ONETIME_PRICE_ID"),
                'tokens': firestore.Increment(5),
                'token_history': firestore.ArrayUnion([{
                    'amount': 5,
                    'type': 'purchase',
                    'timestamp': firestore.SERVER_TIMESTAMP
                }])
            })
        else:
            raise ValueError(f"Unexpected session mode: {session['mode']}")
        
        transaction.update(user_ref, update_data)
    
    try:
        # Execute the transaction
        transaction = db.transaction()
        update_in_transaction(transaction, user_ref, session)
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
