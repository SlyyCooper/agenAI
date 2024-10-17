# This file contains utility functions for handling Stripe payment operations
# It integrates with the Stripe API to manage checkout sessions, payment intents, and webhooks

import stripe
from fastapi import HTTPException
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Stripe with the secret key from environment variables
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Function to create a Stripe checkout session
async def create_checkout_session(plan: str, amount: int, success_url: str, cancel_url: str):
    """
    Creates a Stripe checkout session for a one-time payment.
    This is typically used when a user wants to make a purchase or upgrade their plan.
    """
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
        print(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Function to retrieve a Stripe session
async def retrieve_session(session_id: str):
    """
    Retrieves details of a specific Stripe session.
    This can be used to check the status of a payment after the user completes the checkout process.
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Function to create a Stripe payment intent
async def create_payment_intent(amount: int):
    """
    Creates a PaymentIntent, which represents your intent to collect payment from a customer.
    This is typically used for more complex payment flows or when you need more control over the payment process.
    """
    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd'
        )
        return intent
    except Exception as e:
        print(f"Error creating payment intent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Function to handle Stripe webhooks
async def handle_stripe_webhook(payload, sig_header):
    """
    Handles Stripe webhook events.
    Webhooks allow you to receive real-time notifications about events in your Stripe account,
    such as successful payments, failed payments, or other account activities.
    """
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        # Handle different types of events
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            # Handle successful payment
            # TODO: Implement logic for successful payment (e.g., update user's subscription status)
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            # Handle failed payment
            # TODO: Implement logic for failed payment (e.g., notify user, retry payment)
        # ... handle other event types
        else:
            print('Unhandled event type {}'.format(event['type']))
        
        return {'status': 'success'}
    except Exception as e:
        print(f"Error handling webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
