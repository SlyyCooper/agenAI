from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import stripe
from backend.server.firebase.firebase_utils import verify_firebase_token
from backend.server.firebase.firestore.firestore_utils import (
    get_user_data,
    create_user_profile,
    update_user_data,
    update_payment_history
)

router = APIRouter(
    prefix="/api/user",
    tags=["user"]
)

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

@router.get("/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user['uid']
        user_data = await get_user_data(user_id)
        
        if not user_data:
            # Create profile if it doesn't exist
            user_data = await create_user_profile(
                user_id=user_id,
                email=current_user.get('email', ''),
                name=current_user.get('name', '')
            )
        
        # Add subscription check
        if user_data.get('subscription_id'):
            try:
                subscription = stripe.Subscription.retrieve(user_data['subscription_id'])
                user_data['subscription_status'] = subscription.status
                user_data['subscription_current_period_end'] = subscription.current_period_end
            except Exception as e:
                print(f"Error fetching subscription: {str(e)}")
        
        return user_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile")
async def create_user_profile_route(data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    await create_user_profile(user_id, data.get('email'), data.get('name'))
    return {"message": "Profile created successfully"}

@router.put("/update")
async def update_user_profile(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = current_user['uid']
        await update_user_data(user_id, data)
        return {"message": "Profile updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscription")
async def get_user_subscription(current_user: dict = Depends(get_current_user)):
    try:
        user_data = await get_user_data(current_user['uid'])
        
        # Add detailed subscription info
        subscription_data = {
            'has_access': user_data.get('has_access', False),
            'subscription_status': user_data.get('subscription_status'),
            'subscription_end_date': user_data.get('subscription_end_date'),
            'one_time_purchase': user_data.get('one_time_purchase', False),
            'payment_history': user_data.get('payment_history', [])
        }
        
        # If there's an active subscription, get latest info from Stripe
        if user_data.get('subscription_id'):
            try:
                subscription = stripe.Subscription.retrieve(user_data['subscription_id'])
                subscription_data.update({
                    'current_period_end': subscription.current_period_end,
                    'cancel_at_period_end': subscription.cancel_at_period_end,
                    'status': subscription.status
                })
                
                # Update payment history with latest subscription payment
                if subscription.latest_invoice:
                    invoice = stripe.Invoice.retrieve(subscription.latest_invoice)
                    if invoice.paid:
                        await update_payment_history(current_user['uid'], {
                            'type': 'subscription',
                            'amount': invoice.amount_paid,
                            'status': 'paid',
                            'invoice_id': invoice.id
                        })
            except Exception as e:
                print(f"Error fetching subscription from Stripe: {str(e)}")
        
        return subscription_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/payment-history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    try:
        user_data = await get_user_data(current_user['uid'])
        if not user_data.get('stripe_customer_id'):
            return {"payments": []}
            
        payments = stripe.PaymentIntent.list(
            customer=user_data['stripe_customer_id'],
            limit=10
        )
        
        # Update payment history with any new payments
        for payment in payments.data:
            if payment.status == 'succeeded':
                await update_payment_history(current_user['uid'], {
                    'type': 'payment',
                    'amount': payment.amount,
                    'status': payment.status,
                    'payment_id': payment.id
                })
        
        return {"payments": payments.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/access-status")
async def get_access_status(current_user: dict = Depends(get_current_user)):
    try:
        user_data = await get_user_data(current_user['uid'])
        return {
            "has_access": user_data.get('has_access', False),
            "access_type": "subscription" if user_data.get('subscription_status') == 'active' else "one_time" if user_data.get('one_time_purchase') else None,
            "access_expiry": user_data.get('subscription_end_date')
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
