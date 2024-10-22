from backend.server.firebase_init import db
from backend.server.firestore_init import SERVER_TIMESTAMP, ArrayUnion
from firebase_admin import auth
import logging
import stripe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_user_profile(user_id: str, email: str, name: str = None):
    """Create a new user profile in Firestore."""
    if not user_id or not email:
        raise ValueError("user_id and email are required")
    
    try:
        # Check if profile already exists
        existing_user = await get_user_data(user_id)
        if existing_user:
            return existing_user
            
        # Create Stripe customer
        customer = stripe.Customer.create(
            email=email,
            metadata={'user_id': user_id}
        )
        
        # Prepare user data
        user_data = {
            'email': email,
            'created_at': SERVER_TIMESTAMP,
            'last_login': SERVER_TIMESTAMP,
            'stripe_customer_id': customer.id,
            'has_access': False,
            'one_time_purchase': False
        }
        if name:
            user_data['name'] = name
            
        # Use transaction to ensure atomic operation
        transaction = db.transaction()
        
        @transaction.transactional
        def create_user_in_transaction(transaction):
            user_ref = db.collection('users').document(user_id)
            transaction.set(user_ref, user_data)
            
        create_user_in_transaction(transaction)
        
        logger.info(f"Created user profile for {user_id} with Stripe customer {customer.id}")
        return user_data
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}")
        raise

async def update_user_data(user_id: str, data: dict):
    """Update user data in Firestore."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update(data)
    except Exception as e:
        print(f"Error updating user data: {str(e)}")
        raise

async def get_user_data(user_id: str):
    """Retrieve user data from Firestore."""
    logger.info(f"Fetching data for user: {user_id}")
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        logger.warning(f"No data found for user: {user_id}")
    return doc.to_dict() if doc.exists else None

async def verify_firebase_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Check if user exists in Firestore, if not, create profile
        user_data = await get_user_data(user_id)
        if not user_data:
            await create_user_profile(user_id, email)
        else:
            # Update last login
            await update_user_data(user_id, {'last_login': SERVER_TIMESTAMP})
        
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

async def update_payment_history(user_id: str, payment_data: dict):
    """Update user's payment history."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update({
            'payment_history': ArrayUnion([{
                **payment_data,
                'date': SERVER_TIMESTAMP
            }])
        })
    except Exception as e:
        logger.error(f"Error updating payment history: {str(e)}")
        raise
