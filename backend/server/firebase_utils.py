from backend.server.firebase_init import db
from firebase_admin import auth, firestore
import logging
import stripe

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_user_profile(user_id: str, email: str, name: str = None):
    """Create a new user profile in Firestore."""
    if not user_id or not email:
        raise ValueError("user_id and email are required")
    
    try:
        # Create Stripe customer
        customer = stripe.Customer.create(
            email=email,
            metadata={'user_id': user_id}
        )
        
        user_data = {
            'email': email,
            'created_at': firestore.SERVER_TIMESTAMP,
            'last_login': firestore.SERVER_TIMESTAMP,
            'stripe_customer_id': customer.id  # Add this
        }
        if name:
            user_data['name'] = name
            
        db.collection('users').document(user_id).set(user_data)
    except Exception as e:
        print(f"Error creating user profile: {str(e)}")
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
            await update_user_data(user_id, {'last_login': firestore.SERVER_TIMESTAMP})
        
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None
