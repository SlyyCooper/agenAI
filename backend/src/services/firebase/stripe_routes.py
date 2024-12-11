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
from .firestore_utils import get_user_data, check_processed_event, mark_event_processed
from pydantic import BaseModel
from fastapi.responses import JSONResponse

# Configure detailed logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Validate Stripe configuration
if not os.getenv('STRIPE_SECRET_KEY'):
    raise ValueError("STRIPE_SECRET_KEY environment variable is not set")
if not os.getenv('STRIPE_WEBHOOK_SECRET'):
    raise ValueError("STRIPE_WEBHOOK_SECRET environment variable is not set")

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

router = APIRouter(
    prefix="/api/stripe",
    tags=["stripe"]
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validates Firebase JWT and extracts user identity"""
    token = credentials.credentials
    logger.info("Verifying Firebase token...")
    
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        logger.error("Invalid Firebase token")
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )
    
    logger.info(f"Token verified for user: {decoded_token.get('uid')}")
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
    @purpose: Handles Stripe webhook events with deduplication
    @prereq: Valid Stripe signature
    @performance: Multiple Firestore operations
    """
    try:
        # Verify webhook signature
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        try:
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                os.getenv('STRIPE_WEBHOOK_SECRET')
            )
            return await handle_stripe_webhook(event)
        except stripe.error.SignatureVerificationError as e:
            raise HTTPException(status_code=400, detail="Invalid signature")

    except Exception as e:
        logger.error(f"❌ Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Creates Stripe checkout session for subscription/one-time payments"""
    try:
        user_id = current_user['uid']
        logger.info(f"Creating checkout session for user: {user_id}")
        
        user_data = await get_user_data(user_id)
        if not user_data:
            logger.error(f"User profile not found: {user_id}")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        if not user_data.get('stripe_customer_id'):
            logger.error(f"No Stripe customer ID for user: {user_id}")
            raise HTTPException(status_code=400, detail="Stripe customer not found")
        
        if request.mode not in ['subscription', 'payment']:
            logger.error(f"Invalid mode: {request.mode}")
            raise HTTPException(status_code=400, detail="Invalid mode")
        
        try:
            # Verify price exists in Stripe
            price = stripe.Price.retrieve(request.price_id)
            logger.info(f"Price verified: {price.id}")
        except stripe.error.StripeError as e:
            logger.error(f"Invalid price ID: {request.price_id}")
            raise HTTPException(status_code=400, detail="Invalid price ID")
        
        checkout_session = stripe.checkout.Session.create(
            customer=user_data['stripe_customer_id'],
            mode=request.mode,
            metadata={'user_id': user_id},
            subscription_data={'metadata': {'user_id': user_id}} if request.mode == 'subscription' else None,
            line_items=[{
                'price': request.price_id,
                'quantity': 1,
            }],
            success_url=os.getenv('STRIPE_SUCCESS_URL', 'https://www.agenai.app/success'),
            cancel_url=os.getenv('STRIPE_CANCEL_URL', 'https://www.agenai.app/cancel'),
        )
        
        logger.info(f"Checkout session created: {checkout_session.id}")
        return {"sessionId": checkout_session.id}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
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
    """Retrieves current subscription status and access rights"""
    try:
        user_id = current_user['uid']
        logger.info(f"Fetching subscription status for user: {user_id}")
        
        user_data = await get_user_data(user_id)
        if not user_data:
            logger.error(f"User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get live subscription data from Stripe if available
        subscription_data = {}
        if user_data.get('subscription_id'):
            try:
                subscription = stripe.Subscription.retrieve(user_data['subscription_id'])
                subscription_data = {
                    "subscription_status": subscription.status,
                    "subscription_end_date": subscription.current_period_end,
                }
            except stripe.error.StripeError as e:
                logger.error(f"Error fetching Stripe subscription: {str(e)}")
                # Don't fail the request, just log the error
        
        response_data = {
            "has_access": user_data.get('has_access', False),
            "subscription_status": subscription_data.get('subscription_status', user_data.get('subscription_status')),
            "subscription_end_date": subscription_data.get('subscription_end_date', user_data.get('subscription_end_date')),
            "subscription_id": user_data.get('subscription_id'),
            "one_time_purchase": user_data.get('one_time_purchase', False),
            "tokens": user_data.get('tokens', 0)
        }
        
        logger.info(f"Returning subscription status: {response_data}")
        return response_data
        
    except Exception as e:
        logger.error(f"Error in get_subscription_status: {str(e)}")
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
                'product_id': os.getenv("STRIPE_REPORT_SUBSCRIPTION_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_REPORT_SUBSCRIPTION_PRICE_ID"),
                'name': 'Monthly Subscription',
                'features': [
                    'Unlimited Research Reports',
                    'Priority Support',
                    'Advanced Analytics',
                    'Custom Report Templates',
                ],
            },
            'one_time': {
                'product_id': os.getenv("STRIPE_REPORT_PACK_PRODUCT_ID"),
                'price_id': os.getenv("STRIPE_REPORT_PACK_PRICE_ID"),
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
        subscription_price = stripe.Price.retrieve(os.getenv("STRIPE_REPORT_SUBSCRIPTION_PRICE_ID"))
        onetime_price = stripe.Price.retrieve(os.getenv("STRIPE_REPORT_PACK_PRICE_ID"))

        # @purpose: Convert prices from cents to dollars
        products['subscription']['price'] = subscription_price.unit_amount / 100
        products['one_time']['price'] = onetime_price.unit_amount / 100

        logger.info(f"Returning products: {products}")
        return products
    except Exception as e:
        logger.error(f"Error in get_products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
