import stripe
from fastapi import HTTPException
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def create_checkout_session(plan: str, amount: int, success_url: str, cancel_url: str):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': plan,
                    },
                    'unit_amount': amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
        )
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def retrieve_session(session_id: str):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def create_payment_intent(amount: int):
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd'
        )
        return intent
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def handle_stripe_webhook(payload, sig_header):
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
        )
        return event
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
