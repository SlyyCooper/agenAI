import os
from dotenv import load_dotenv
import stripe
from stripe.error import StripeError
from fastapi import HTTPException
from urllib.parse import urlparse
from backend.server.firebase_utils import update_user_data, get_user_data
import firebase_admin
from firebase_admin import firestore
from typing import Dict
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Constants
ONE_TIME_PRODUCT_ID = "prod_R0bEOf1dWZCjyY"
ONE_TIME_PRICE_ID = "price_1Q8a1z060pc64aKuwy1n1wzz"
SUBSCRIPTION_PRODUCT_ID = "prod_Qvu89XrhkHjzZU"
SUBSCRIPTION_PRICE_ID = "price_1Q42KT060pc64aKupjCogJZN"

# Get Stripe webhook secret based on the domain
def get_stripe_webhook_secret(domain: str) -> str:
    webhook_secrets = {
        "gpt-researcher-costom.vercel.app": os.getenv("STRIPE_WEBHOOK_SECRET_GPT_RESEARCHER"),
        "www.tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE_WWW"),
        "tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE"),
        "agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI"),
        "www.agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI_WWW"),
    }
    return webhook_secrets.get(domain, "")

async def create_stripe_customer(user_id: str, email: str):
    try:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id}
        )
        await update_user_data(user_id, {
            "stripe_customer_id": customer.id,
            "stripe_created_at": firestore.SERVER_TIMESTAMP,
            "total_amount_paid": 0,
            "reports_generated": 0
        })
        return customer.id
    except StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

async def update_subscription_data(user_id: str, subscription: stripe.Subscription):
    plan = subscription.plan
    subscription_data = {
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
        "subscription_plan": {
            "id": plan.id,
            "nickname": plan.nickname,
            "amount": plan.amount,
            "currency": plan.currency,
            "interval": plan.interval,
            "interval_count": plan.interval_count,
        },
        "subscription_start_date": firestore.Timestamp.from_seconds(subscription.start_date),
        "subscription_current_period_end": firestore.Timestamp.from_seconds(subscription.current_period_end),
        "subscription_cancel_at_period_end": subscription.cancel_at_period_end,
        "subscription_items": [{
            "id": item.id,
            "price": {
                "id": item.price.id,
                "nickname": item.price.nickname,
                "unit_amount": item.price.unit_amount,
                "currency": item.price.currency,
            }
        } for item in subscription.items.data],
    }
    
    if subscription.canceled_at:
        subscription_data["subscription_canceled_at"] = firestore.Timestamp.from_seconds(subscription.canceled_at)
    
    await update_user_data(user_id, subscription_data)

async def handle_successful_payment(session: stripe.checkout.Session):
    customer_id = session.customer
    amount = session.amount_total
    
    customer = stripe.Customer.retrieve(customer_id)
    user_id = customer.metadata.get('user_id')
    
    if user_id:
        user_data = await get_user_data(user_id)
        new_total = user_data.get('total_amount_paid', 0) + amount
        await update_user_data(user_id, {
            "total_amount_paid": new_total,
            "last_payment_date": firestore.SERVER_TIMESTAMP,
            "last_payment_amount": amount
        })

async def handle_stripe_webhook(payload, sig_header, webhook_secret):
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            await handle_successful_payment(session)
            await handle_checkout_session_completed(session)
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            customer = stripe.Customer.retrieve(subscription.customer)
            user_id = customer.metadata.get('user_id')
            if user_id:
                await update_subscription_data(user_id, subscription)
        
        return event
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

async def get_subscription_details(user_id: str):
    user_data = await get_user_data(user_id)
    subscription_id = user_data.get('subscription_id')
    if not subscription_id:
        return None
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        plan = subscription.plan
        return {
            'id': subscription.id,
            'status': subscription.status,
            'plan': {
                'id': plan.id,
                'nickname': plan.nickname,
                'amount': plan.amount,
                'currency': plan.currency,
                'interval': plan.interval,
                'interval_count': plan.interval_count,
            },
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    except stripe.error.StripeError as e:
        print(f"Error retrieving subscription: {e}")
        return None

async def get_payment_history(user_id: str, limit: int = 10):
    try:
        user_data = await get_user_data(user_id)
        customer_id = user_data.get('stripe_customer_id')
        if not customer_id:
            return []
        
        charges = stripe.Charge.list(customer=customer_id, limit=limit)
        return [{
            'id': charge.id,
            'amount': charge.amount,
            'currency': charge.currency,
            'status': charge.status,
            'created': charge.created
        } for charge in charges.data]
    except stripe.error.StripeError as e:
        print(f"Error retrieving payment history: {e}")
        return []

async def cancel_subscription(user_id: str):
    try:
        user_data = await get_user_data(user_id)
        subscription_id = user_data.get('subscription_id')
        if not subscription_id:
            return False
        
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        await update_user_data(user_id, {
            'subscription_cancel_at_period_end': True
        })
        return True
    except stripe.error.StripeError as e:
        print(f"Error cancelling subscription: {e}")
        return False

async def handle_checkout_session_completed(session):
    customer_id = session['customer']
    customer = stripe.Customer.retrieve(customer_id)
    user_id = customer.metadata.get('user_id')
    
    if not user_id:
        print(f"Error: Unable to find user_id for customer {customer_id}")
        return
    
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    checkout_ref = user_ref.collection('checkout_sessions').document(session['id'])
    
    checkout_ref.update({
        'status': 'completed',
        'completed_at': firestore.SERVER_TIMESTAMP,
    })
    
    if session['mode'] == 'subscription':
        subscription_id = session['subscription']
        subscription = stripe.Subscription.retrieve(subscription_id)
        await update_subscription_data(user_id, subscription)
    elif session['mode'] == 'payment':
        payment_intent_id = session['payment_intent']
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        user_ref.collection('payments').add({
            'payment_intent_id': payment_intent_id,
            'amount': payment_intent.amount,
            'currency': payment_intent.currency,
            'status': payment_intent.status,
            'created_at': firestore.SERVER_TIMESTAMP,
            'product_id': session['metadata']['product_id'],
            'price_id': session['metadata']['price_id'],
            'product_type': session['metadata']['product_type'],
        })

def update_environment_variables(config: Dict[str, str]):
    for key, value in config.items():
        os.environ[key] = value
    
    # Initialize Stripe after updating environment variables
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def create_checkout_session(mode: str, success_url: str, cancel_url: str):
    if mode == 'payment':
        price_id = ONE_TIME_PRICE_ID
    elif mode == 'subscription':
        price_id = SUBSCRIPTION_PRICE_ID
    else:
        raise ValueError("Invalid mode. Must be 'payment' or 'subscription'.")

    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price': price_id,
            'quantity': 1,
        }],
        mode=mode,
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return session

async def get_user_subscription(user_id: str):
    user_data = await get_user_data(user_id)
    subscription_id = user_data.get('subscription_id')
    if not subscription_id:
        return None
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end
        }
    except stripe.error.StripeError as e:
        print(f"Error retrieving subscription: {e}")
        return None

async def get_user_payments(user_id: str, limit: int = 10):
    try:
        user_data = await get_user_data(user_id)
        customer_id = user_data.get('stripe_customer_id')
        if not customer_id:
            return []

        charges = stripe.Charge.list(customer=customer_id, limit=limit)
        return [
            {
                'id': charge.id,
                'amount': charge.amount / 100,  # Convert cents to dollars
                'currency': charge.currency,
                'status': charge.status,
                'date': datetime.fromtimestamp(charge.created).isoformat(),
            }
            for charge in charges.data
        ]
    except stripe.error.StripeError as e:
        print(f"Error retrieving user payments: {e}")
        return []
