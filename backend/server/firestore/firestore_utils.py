from backend.server.firestore.firestore_init import db, SERVER_TIMESTAMP, ArrayUnion
import logging
import stripe
from datetime import datetime
from backend.server.token_management.token_utils import SUBSCRIPTION_MONTHLY_TOKENS, ONE_TIME_PURCHASE_TOKENS

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
            'tokens': 0,  # Initialize tokens to 0
            'token_history': [],  # Initialize empty token history
            'subscription_status': None,
            'subscription_id': None,
            'subscription_end_date': None
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

async def update_payment_history(user_id: str, payment_data: dict):
    """Update user's payment history."""
    try:
        user_ref = db.collection('users').document(user_id)
        
        # Create payment record with proper timestamp
        payment_record = {
            **payment_data,
            'created_at': datetime.now().isoformat()
        }
        
        # Update using ArrayUnion with the properly formatted record
        user_ref.update({
            'payment_history': ArrayUnion([payment_record])
        })
        
        logger.info(f"Successfully updated payment history for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating payment history: {str(e)}")
        raise

async def create_report_document(user_id: str, report_data: dict):
    """Create a new report document in Firestore."""
    try:
        report_ref = db.collection('users').document(user_id)\
                      .collection('reports').document()
        
        report_ref.set({
            'title': report_data['title'],
            'created_at': SERVER_TIMESTAMP,
            'file_urls': report_data['file_urls'],
            'query': report_data['query'],
            'report_type': report_data['report_type']
        })
        
        return report_ref.id
    except Exception as e:
        logger.error(f"Error creating report document: {str(e)}")
        raise

async def update_user_tokens(user_id: str, amount: int, reason: str):
    """Update user's token balance and history."""
    try:
        user_ref = db.collection('users').document(user_id)
        
        update_data = {
            'tokens': db.Increment(amount),
            'token_history': ArrayUnion([{
                'amount': amount,
                'type': reason,
                'timestamp': SERVER_TIMESTAMP
            }])
        }
        
        user_ref.update(update_data)
        logger.info(f"Updated tokens for user {user_id}: {amount} tokens ({reason})")
        return True
    except Exception as e:
        logger.error(f"Error updating user tokens: {str(e)}")
        raise

async def get_user_token_balance(user_id: str) -> int:
    """Get user's current token balance."""
    try:
        user_data = await get_user_data(user_id)
        return user_data.get('tokens', 0) if user_data else 0
    except Exception as e:
        logger.error(f"Error getting token balance: {str(e)}")
        raise

async def get_user_token_history(user_id: str) -> list:
    """Get user's token transaction history."""
    try:
        user_data = await get_user_data(user_id)
        return user_data.get('token_history', []) if user_data else []
    except Exception as e:
        logger.error(f"Error getting token history: {str(e)}")
        raise

async def handle_subscription_tokens(user_id: str, is_renewal: bool = False):
    """Handle token updates for subscription events."""
    reason = 'subscription_renewal' if is_renewal else 'subscription'
    return await update_user_tokens(user_id, SUBSCRIPTION_MONTHLY_TOKENS, reason)

async def handle_one_time_purchase_tokens(user_id: str):
    """Handle token updates for one-time purchases."""
    return await update_user_tokens(user_id, ONE_TIME_PURCHASE_TOKENS, 'purchase')
