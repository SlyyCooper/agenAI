from fastapi import APIRouter, Request, HTTPException, Depends, logger
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import stripe
import os
from backend.server.stripe_utils import handle_stripe_webhook
from backend.server.firebase_utils import verify_firebase_token, get_user_data
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/stripe",
    tags=["stripe"]
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

# Add request model
class CheckoutSessionRequest(BaseModel):
    price_id: str
    mode: str

@router.post("/webhook")
async def stripe_webhook(request: Request):
    try:
        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature")
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="No Stripe signature found")
            
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
        return await handle_stripe_webhook(event)
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user['uid']
        user_data = await get_user_data(user_id)
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        if not user_data.get('stripe_customer_id'):
            raise HTTPException(status_code=400, detail="Stripe customer not found")

        # Add mode validation
        if request.mode not in ['subscription', 'payment']:
            raise HTTPException(status_code=400, detail="Invalid mode")

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
    try:
        user_data = await get_user_data(current_user['uid'])
        
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "has_access": user_data.get('has_access', False),
            "subscription_status": user_data.get('subscription_status'),
            "subscription_end_date": user_data.get('subscription_end_date'),
            "subscription_id": user_data.get('subscription_id'),
            "one_time_purchase": user_data.get('one_time_purchase', False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products")
async def get_products():
    print("Products endpoint hit")
    try:
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

        # Fetch current prices from Stripe
        subscription_price = stripe.Price.retrieve(os.getenv("STRIPE_SUBSCRIPTION_PRICE_ID"))
        onetime_price = stripe.Price.retrieve(os.getenv("STRIPE_ONETIME_PRICE_ID"))

        # Add current prices to response
        products['subscription']['price'] = subscription_price.unit_amount / 100
        products['one_time']['price'] = onetime_price.unit_amount / 100

        print(f"Returning products: {products}")
        return products
    except Exception as e:
        print(f"Error in get_products: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
