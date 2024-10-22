import os
from datetime import datetime
import stripe
from fastapi.responses import JSONResponse
from backend.server.firebase_init import db

def initialize_stripe():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def handle_stripe_webhook(event):
    """Handle Stripe webhook events."""
    print(f"Processing Stripe webhook event: {event['type']}")
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await fulfill_order(session)
        elif event['type'] == 'invoice.paid':
            invoice = event['data']['object']
            await update_subscription_status(invoice)
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            await handle_subscription_cancellation(subscription)
        else:
            print(f'Unhandled event type {event["type"]}')

        return JSONResponse(content={"status": "success"})
    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

async def fulfill_order(session):
    user_id = session['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    @db.transaction
    def update_in_transaction(transaction):
        if session['mode'] == 'subscription':
            # Handle subscription
            subscription_id = session['subscription']
            subscription = stripe.Subscription.retrieve(subscription_id)
            current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
            
            transaction.update(user_ref, {
                'subscription_status': 'active',
                'subscription_id': subscription_id,
                'subscription_end_date': current_period_end,
                'product_id': os.getenv("STRIPE_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"),
                'has_access': True
            })
        else:
            # Handle one-time payment
            transaction.update(user_ref, {
                'one_time_purchase': True,
                'purchase_date': db.SERVER_TIMESTAMP,
                'product_id': os.getenv("STRIPE_ONETIME_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_ONETIME_PRICE_ID"),
                'has_access': True
            })
    
    print(f"Order fulfilled for user {user_id}")

async def update_subscription_status(invoice):
    user_id = invoice['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    subscription = stripe.Subscription.retrieve(invoice['subscription'])
    current_period_end = datetime.fromtimestamp(subscription['current_period_end'])
    
    user_ref.update({
        'subscription_status': 'active',
        'last_payment_date': db.SERVER_TIMESTAMP,
        'subscription_end_date': current_period_end,
        'has_access': True
    })
    
    print(f"Subscription status updated for user {user_id}")

async def handle_subscription_cancellation(subscription):
    user_id = subscription['metadata']['user_id']
    user_ref = db.collection('users').document(user_id)
    
    user_ref.update({
        'subscription_status': 'cancelled',
        'subscription_end_date': datetime.fromtimestamp(subscription['current_period_end']),
        'has_access': False
    })
    
    print(f"Subscription cancelled for user {user_id}")
