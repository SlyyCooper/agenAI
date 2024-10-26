from backend.server.firebase.firebase_init import db
from backend.server.firebase.firestore.firestore_init import SERVER_TIMESTAMP, ArrayUnion
from firebase_admin import auth
import logging
import stripe
from datetime import datetime

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
        
        # Prepare user data with current timestamp instead of SERVER_TIMESTAMP
        current_time = datetime.now().isoformat()
        user_data = {
            'email': email,
            'created_at': current_time,
            'last_login': current_time,
            'stripe_customer_id': customer.id,
            'has_access': False,
            'one_time_purchase': False,
            'tokens': 0  # Add initial tokens count
        }
        if name:
            user_data['name'] = name
            
        # Create user document
        user_ref = db.collection('users').document(user_id)
        # Use SERVER_TIMESTAMP in the actual Firestore document
        firestore_data = {
            **user_data,
            'created_at': SERVER_TIMESTAMP,
            'last_login': SERVER_TIMESTAMP
        }
        user_ref.set(firestore_data)
        
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
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return None

async def update_payment_history(user_id: str, payment_data: dict):
    """Update user's payment history."""
    try:
        user_ref = db.collection('users').document(user_id)
        
        # Create payment record with proper timestamp
        payment_record = {
            **payment_data,
            'created_at': datetime.now().isoformat()  # Use ISO format string instead of SERVER_TIMESTAMP
        }
        
        # Update using ArrayUnion with the properly formatted record
        user_ref.update({
            'payment_history': ArrayUnion([payment_record])
        })
        
        logger.info(f"Successfully updated payment history for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating payment history: {str(e)}")
        raise
