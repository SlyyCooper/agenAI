from backend.server.firebase.firestore.firestore_init import db, SERVER_TIMESTAMP, ArrayUnion
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
            'tokens': 0
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
        
        # Use a transaction to ensure atomic updates
        @db.transactional
        def update_tokens_transaction(transaction, user_ref):
            user_doc = user_ref.get(transaction=transaction)
            if not user_doc.exists:
                raise ValueError(f"User {user_id} not found")
            
            current_tokens = user_doc.to_dict().get('tokens', 0)
            new_token_count = current_tokens + amount
            
            if new_token_count < 0:
                raise ValueError("Insufficient tokens")
            
            transaction.update(user_ref, {
                'tokens': new_token_count,
                'token_history': ArrayUnion([{
                    'amount': amount,
                    'type': reason,
                    'balance': new_token_count,
                    'timestamp': SERVER_TIMESTAMP
                }]),
                'last_updated': SERVER_TIMESTAMP
            })
            
            return new_token_count
            
        new_balance = update_tokens_transaction(db.transaction(), user_ref)
        logger.info(f"Updated tokens for user {user_id}: {amount} ({reason}). New balance: {new_balance}")
        return new_balance
        
    except Exception as e:
        logger.error(f"Error updating tokens: {str(e)}")
        raise

async def get_user_token_balance(user_id: str):
    """Get user's current token balance."""
    try:
        user_data = await get_user_data(user_id)
        if not user_data:
            raise ValueError(f"User {user_id} not found")
        return user_data.get('tokens', 0)
    except Exception as e:
        logger.error(f"Error getting token balance: {str(e)}")
        raise

async def consume_tokens(user_id: str, amount: int, reason: str = "usage"):
    """Consume tokens for a service."""
    try:
        current_balance = await get_user_token_balance(user_id)
        if current_balance < amount:
            raise ValueError("Insufficient tokens")
            
        return await update_user_tokens(user_id, -amount, reason)
    except Exception as e:
        logger.error(f"Error consuming tokens: {str(e)}")
        raise
