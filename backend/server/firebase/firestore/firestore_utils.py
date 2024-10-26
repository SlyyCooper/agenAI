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
            'remaining_reports': 0
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

async def update_report_history(user_id: str, amount: int, type: str, reason: str = None):
    """Update user's report history."""
    try:
        user_ref = db.collection('users').document(user_id)
        
        # Create report history record
        history_record = {
            'amount': amount,
            'type': type,
            'timestamp': SERVER_TIMESTAMP,
            'reason': reason
        }
        
        # Update the document
        user_ref.update({
            'report_history': ArrayUnion([history_record]),
            'remaining_reports': db.field_path('remaining_reports') + amount
        })
        
        logger.info(f"Successfully updated report history for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating report history: {str(e)}")
        raise

async def get_user_reports(user_id: str) -> dict:
    """Get user's reports and history."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise ValueError(f"User {user_id} not found")
            
        user_data = user_doc.to_dict()
        
        # Get reports collection
        reports_ref = user_ref.collection('reports')
        reports = [doc.to_dict() for doc in reports_ref.order_by('created_at', direction='DESCENDING').stream()]
        
        return {
            'reports': reports,
            'remaining_reports': user_data.get('remaining_reports', 0),
            'report_history': user_data.get('report_history', [])
        }
    except Exception as e:
        logger.error(f"Error getting user reports: {str(e)}")
        raise

async def consume_report(user_id: str, reason: str) -> dict:
    """Consume one report from user's balance."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            raise ValueError(f"User {user_id} not found")
            
        user_data = user_doc.to_dict()
        remaining_reports = user_data.get('remaining_reports', 0)
        
        if remaining_reports <= 0:
            return {
                'success': False,
                'remaining_reports': 0,
                'message': 'No reports available'
            }
            
        # Update report history and decrement remaining_reports
        await update_report_history(user_id, -1, 'consume', reason)
        
        return {
            'success': True,
            'remaining_reports': remaining_reports - 1
        }
    except Exception as e:
        logger.error(f"Error consuming report: {str(e)}")
        raise
