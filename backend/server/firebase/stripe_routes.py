"""
@purpose: Provides FastAPI routes for Stripe payment integration with Firebase authentication
@prereq: Requires configured Stripe API keys, Firebase Admin SDK, and environment variables
@reference: Used with firestore_utils.py for user data management
@maintenance: Monitor Stripe API version compatibility and webhook signatures
"""

import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import stripe
import os
from .stripe_utils import handle_stripe_webhook
from .firebase import verify_firebase_token
from .firestore_utils import get_user_data
from pydantic import BaseModel

# @purpose: Configure module-level logging
logger = logging.getLogger(__name__)

# @purpose: Define route grouping and authentication
router = APIRouter(
    prefix="/api/stripe",
    tags=["stripe"]
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    @purpose: Validates Firebase JWT and extracts user identity
    @prereq: Valid Firebase JWT in Authorization header
    @performance: Requires Firebase Admin SDK verification call
    """
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

class CheckoutSessionRequest(BaseModel):
    """
    @purpose: Validates checkout session creation parameters
    @invariant: mode must be either 'subscription' or 'payment'
    """
    price_id: str
    mode: str

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    @purpose: Handles incoming Stripe webhook events
    @prereq: Valid Stripe signature header and webhook secret
    @limitation: Must be configured with correct webhook signing secret
    """
    try:
        # @purpose: Enhanced webhook request logging for debugging
        logger.info(f"""
        Webhook Request Details:
        - Full URL: {request.url}
        - Base URL: {request.base_url}
        - Headers: {request.headers}
        - Client: {request.client.host if request.client else 'Unknown'}
        - Stripe-Signature: {request.headers.get('Stripe-Signature', 'Not Found')}
        """)
        
        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature")
        
        if not sig_header:
            logger.warning("No Stripe signature found in headers")
            raise HTTPException(status_code=400, detail="No Stripe signature found")
            
        # @purpose: Verify webhook authenticity using Stripe signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
        logger.info(f"Successfully constructed Stripe event: {event.type}")
        return await handle_stripe_webhook(event)
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Creates Stripe checkout session for subscription/one-time payments
    @prereq: User must have Stripe customer ID
    @example: POST /api/stripe/create-checkout-session {'price_id': 'price_H5ggYwtDq4fbrJ', 'mode': 'subscription'}
    """
    try:
        user_id = current_user['uid']
        user_data = await get_user_data(user_id)
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        if not user_data.get('stripe_customer_id'):
            raise HTTPException(status_code=400, detail="Stripe customer not found")

        # @purpose: Validate checkout mode
        if request.mode not in ['subscription', 'payment']:
            raise HTTPException(status_code=400, detail="Invalid mode")

        # @purpose: Create Stripe checkout session with user metadata
        checkout_session = stripe.checkout.Session.create(
            customer=user_data['stripe_customer_id'],
            mode=request.mode,
            metadata={'user_id': user_id},
            subscription_data={'metadata': {'user_id': user_id}} if request.mode == 'subscription' else None,
            line_items=[{
                'price': request.price_id,
                'quantity': 1,
            }],
            success_url="https://agenai.app/success",
            cancel_url="https://agenai.app/cancel",
        )
        
        return {"sessionId": checkout_session.id}
    except Exception as e:
        logger.error(f"Checkout session error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-portal-session")
async def create_portal_session(current_user: dict = Depends(get_current_user)):
    """
    @purpose: Creates Stripe customer portal session for subscription management
    @prereq: User must have Stripe customer ID
    @performance: Single Stripe API call
    """
    try:
        user_id = current_user['uid']
        user_data = await get_user_data(user_id)
        
        if not user_data.get('stripe_customer_id'):
            raise HTTPException(status_code=400, detail="No Stripe customer found")
        
        portal_session = stripe.billing_portal.Session.create(
            customer=user_data['stripe_customer_id'],
            return_url="https://agenai.app/dashboard"
        )
        
        return {"url": portal_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cancel-subscription")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """
    @purpose: Cancels user's active subscription at period end
    @prereq: User must have active subscription
    @limitation: Cannot immediately cancel, only at period end
    """
    try:
        user_id = current_user['uid']
        user_data = await get_user_data(user_id)
        
        if not user_data.get('subscription_id'):
            raise HTTPException(status_code=400, detail="No active subscription found")
        
        subscription = stripe.Subscription.modify(
            user_data['subscription_id'],
            cancel_at_period_end=True
        )
        
        return {"status": "subscription_cancelled", "subscription": subscription}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscription-status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """
    @purpose: Retrieves current subscription status and access rights
    @prereq: User must exist in database
    @performance: Single Firestore read operation
    """
    try:
        user_data = await get_user_data(current_user['uid'])
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "has_access": user_data.get('has_access', False),
            "subscription_status": user_data.get('subscription_status'),
            "subscription_end_date": user_data.get('subscription_end_date'),
            "subscription_id": user_data.get('subscription_id'),
            "one_time_purchase": user_data.get('one_time_purchase', False),
            "tokens": user_data.get('tokens', 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products")
async def get_products():
    """
    @purpose: Retrieves available products with current pricing from Stripe
    @prereq: Requires configured Stripe product and price IDs in environment
    @performance: Two Stripe API calls for price retrieval
    """
    logger.info("Products endpoint hit")
    try:
        # @purpose: Define product offerings and features
        products = {
            'subscription': {
                'product_id': os.getenv("STRIPE_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"),
                'name': 'Monthly Subscription',
                'features': [
                    'Unlimited Research Reports',
                    'Priority Support',
                    'Advanced Analytics',
                    'Custom Report Templates',
                ],
            },
            'one_time': {
                'product_id': os.getenv("STRIPE_ONETIME_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_ONETIME_PRICE_ID"),
                'name': 'One-Time Purchase',
                'features': [
                    '10 Research Reports',
                    'Basic Support',
                    'Standard Analytics',
                    '30-Day Access',
                ],
            }
        }

        # @purpose: Fetch current prices from Stripe
        subscription_price = stripe.Price.retrieve(os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"))
        onetime_price = stripe.Price.retrieve(os.getenv("STRIPE_ONETIME_PRICE_ID"))

        # @purpose: Convert prices from cents to dollars
        products['subscription']['price'] = subscription_price.unit_amount / 100
        products['one_time']['price'] = onetime_price.unit_amount / 100

        logger.info(f"Returning products: {products}")
        return products
    except Exception as e:
        logger.error(f"Error in get_products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
