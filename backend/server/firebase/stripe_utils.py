"""
@purpose: Manages Stripe webhook event processing and user subscription/payment state
@prereq: Requires configured Stripe API, Firebase Admin SDK, and environment variables
@reference: Used with stripe_routes.py for payment flow integration
@maintenance: Monitor Stripe API version compatibility and webhook signature verification
"""

import os
from datetime import datetime
from fastapi.responses import JSONResponse
from .firebase import db, firestore
import stripe
import logging

logger = logging.getLogger(__name__)

async def handle_stripe_webhook(event):
    """
    @purpose: Routes and processes incoming Stripe webhook events
    @prereq: Valid Stripe event with signature verification
    @performance: O(1) lookup of handler, variable processing time per event type
    @example: await handle_stripe_webhook(stripe_event)
    """
    logger.info(f"Processing Stripe webhook event: {event['type']}")
    
    # @purpose: Map event types to their handlers
    # @maintenance: Update when adding new event types
    handlers = {
        'customer.created': handle_customer_created,
        'checkout.session.completed': fulfill_order,
        'invoice.paid': update_subscription_status,
        'customer.subscription.deleted': handle_subscription_cancellation,
        'payment_intent.succeeded': handle_payment_success,
        'payment_intent.created': handle_payment_intent_created,
        'charge.succeeded': lambda x: handle_charge_succeeded(x),
        'charge.updated': lambda x: handle_charge_updated(x)
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
    """
    @purpose: Processes new Stripe customer creation and links to Firebase user
    @prereq: Customer object must contain user_id in metadata
    @invariant: One-to-one mapping between Stripe customer and Firebase user
    @performance: Single Firestore read + single write transaction
    """
    try:
        user_id = customer['metadata'].get('user_id')
        if not user_id:
            logger.warning("No user_id in customer metadata")
            return
            
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        # @purpose: Update existing user or create new one
        if user_doc.exists:
            user_ref.update({
                'stripe_customer_id': customer['id'],
                'stripe_created_at': firestore.SERVER_TIMESTAMP,
                'customer_email': customer['email'],
                'last_updated': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Successfully processed customer.created for user {user_id}")
        else:
            # @purpose: Initialize new user with default state
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
    """
    @purpose: Processes completed checkout sessions and grants tokens for one-time purchases
    @prereq: Valid session with user_id in metadata
    """
    user_id = session.get('metadata', {}).get('user_id')
    if not user_id:
        logger.error("No user_id found in session metadata")
        raise ValueError("Missing user_id in session metadata")
        
    user_ref = db.collection('users').document(user_id)
    
    try:
        if session['mode'] == 'payment':
            # Modern atomic token update for one-time purchase
            user_ref.update({
                'tokens': firestore.Increment(5),  # Add 5 tokens
                'one_time_purchase': True,
                'has_access': True,
                'token_history': firestore.ArrayUnion([{
                    'amount': 5,
                    'type': 'purchase',
                    'timestamp': firestore.SERVER_TIMESTAMP
                }]),
                'last_updated': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Added 5 tokens for user {user_id}")
            
        elif session['mode'] == 'subscription':
            # Subscription purchase
            subscription_id = session['subscription']
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            user_ref.update({
                'has_access': True,
                'subscription_status': 'active',
                'subscription_id': subscription_id,
                'subscription_end_date': datetime.fromtimestamp(subscription['current_period_end']),
                'product_id': os.getenv("STRIPE_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"),
                'last_updated': firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Activated subscription for user {user_id}")
            
        else:
            raise ValueError(f"Unexpected session mode: {session['mode']}")
            
    except Exception as e:
        logger.error(f"Error fulfilling order: {str(e)}")
        raise

async def update_subscription_status(invoice):
    """
    @purpose: Updates user subscription status on successful invoice payment
    @prereq: Invoice must contain user_id in metadata
    @performance: Single atomic Firestore write
    """
    try:
        user_id = invoice['metadata']['user_id']
        user_ref = db.collection('users').document(user_id)
        
        # Modern approach: Direct atomic update instead of transaction
        subscription = stripe.Subscription.retrieve(invoice['subscription'])
        current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
        
        # Single atomic update
        user_ref.update({
            'subscription_status': 'active',
            'last_payment_date': firestore.SERVER_TIMESTAMP,
            'subscription_end_date': current_period_end,
            'has_access': True,
            'last_updated': firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Subscription updated for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating subscription: {str(e)}")
        raise

async def handle_subscription_cancellation(subscription):
    """
    @purpose: Processes subscription cancellation and revokes access
    @prereq: Subscription must contain user_id in metadata
    @performance: Single Firestore write operation
    """
    user_id = subscription['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    user_ref.update({
        'subscription_status': 'cancelled',
        'subscription_end_date': datetime.fromtimestamp(subscription['current_period_end']),
        'has_access': False
    })
    
    print(f"Subscription cancelled for user {user_id}")

async def handle_payment_success(payment_intent):
    """
    @purpose: Updates user payment history on successful payment
    @prereq: Payment intent must contain user_id in metadata
    @performance: Single Firestore write operation
    """
    if 'metadata' in payment_intent and 'user_id' in payment_intent['metadata']:
        user_id = payment_intent['metadata']['user_id']
        user_ref = db.collection('users').document(user_id)
        
        user_ref.update({
            'last_payment_date': firestore.SERVER_TIMESTAMP,
            'last_payment_amount': payment_intent['amount'] / 100,
            'payment_status': 'succeeded'
        })

async def handle_charge_succeeded(charge):
    """
    @purpose: Logs successful charge events
    @performance: O(1) logging operation
    """
    logger.info("Received charge.succeeded event")
    return JSONResponse(content={"status": "success"})

async def handle_charge_updated(charge):
    """
    @purpose: Logs charge update events
    @performance: O(1) logging operation
    """
    logger.info("Received charge.updated event")
    return JSONResponse(content={"status": "success"})

async def handle_payment_intent_created(payment_intent):
    """
    @purpose: Logs payment intent creation events
    @performance: O(1) logging operation
    """
    logger.info("Received payment_intent.created event")
    return JSONResponse(content={"status": "success"})
