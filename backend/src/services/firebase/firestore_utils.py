"""
@purpose: Provides core Firestore database operations for user management and reporting
@prereq: Requires configured Firebase Admin SDK and Stripe integration
@reference: Used by firestore_routes.py for API endpoints
"""

import logging
from datetime import datetime, timedelta

import stripe
from google.cloud import firestore
from google.cloud.exceptions import Conflict

from src.services.firebase.firebase import db, SERVER_TIMESTAMP, ArrayUnion
from src.services.firebase.models import UserProfile, ProcessedEvent
from src.api.middleware.validation import validate_request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@validate_request(response_model=UserProfile)
async def create_user_profile(user_id: str, data: dict):
    """Creates new user profile with Stripe customer integration"""
    if not user_id or not data.get('email'):
        raise ValueError("user_id and email are required")
    
    try:
        # Check for existing profile
        existing_user = await get_user_data(user_id)
        if existing_user:
            return existing_user
            
        # Create Stripe customer
        customer = stripe.Customer.create(
            email=data['email'],
            metadata={'user_id': user_id}
        )
        
        # Prepare and validate user data
        current_time = datetime.now()
        user_data = {
            'email': data['email'],
            'created_at': current_time,
            'last_login': current_time,
            'stripe_customer_id': customer.id,
            'tokens': 0,
            'has_access': False,
            'one_time_purchase': False,
            'token_history': [],
            'name': data.get('name')
        }
        
        # Store data (validation happens through decorator)
        await db.collection('users').document(user_id).set(user_data)
        return user_data
        
    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}")
        raise

@validate_request(response_model=ProcessedEvent)
async def create_processed_event(event_data: dict):
    """Creates a new processed event record"""
    try:
        # Validation happens through decorator
        await db.collection('processed_events').document(event_data['event_id']).set(event_data)
        return event_data
    except Exception as e:
        logger.error(f"Error creating processed event: {str(e)}")
        raise

async def update_user_data(user_id: str, data: dict):
    """Updates user data in Firestore"""
    try:
        logger.info(f"📝 Updating user data for: {user_id}")
        logger.debug(f"📋 Update data: {data}")
        
        user_ref = db.collection('users').document(user_id)
        
        # Add timestamp
        data['last_updated'] = firestore.SERVER_TIMESTAMP
        
        user_ref.update(data)
        logger.info(f"✅ User data updated: {user_id}")
        
    except Exception as e:
        logger.error(f"🚨 Error updating user data: {str(e)}")
        raise

async def get_user_data(user_id: str):
    """Retrieves user data from Firestore"""
    try:
        logger.info(f"📖 Fetching user data for: {user_id}")
        user_ref = db.collection('users').document(user_id)
        doc = user_ref.get()
        
        if not doc.exists:
            logger.warning(f"❌ User not found: {user_id}")
            return None
            
        user_data = doc.to_dict()
        logger.info(f"✅ User data retrieved: {user_id}")
        logger.debug(f"📋 User data: {user_data}")  # Detailed data in debug level
        return user_data
        
    except Exception as e:
        logger.error(f"🚨 Error fetching user data: {str(e)}")
        raise

async def update_payment_history(user_id: str, payment_data: dict):
    """
    @purpose: Appends new payment record to user's payment history
    @prereq: User profile must exist
    @invariant: Payment records are append-only
    @performance: Single Firestore array update operation
    """
    try:
        user_ref = db.collection('users').document(user_id)
        
        # @purpose: Create timestamped payment record
        payment_record = {
            **payment_data,
            'created_at': datetime.now().isoformat()
        }
        
        # @purpose: Atomic array update using ArrayUnion
        user_ref.update({
            'payment_history': ArrayUnion([payment_record])
        })
        
        logger.info(f"Successfully updated payment history for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating payment history: {str(e)}")
        raise

async def create_report_document(user_id: str, report_data: dict):
    """
    @purpose: Creates new report document in user's reports collection
    @prereq: User profile must exist
    @performance: Single Firestore write operation
    @example: report_id = await create_report_document(user_id, {'title': 'Report'})
    """
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
    """Updates user token balance"""
    try:
        logger.info(f"💰 Updating tokens for user {user_id}: {amount} ({reason})")
        user_ref = db.collection('users').document(user_id)
        
        # Get current balance for logging
        doc = user_ref.get()
        if doc.exists:
            current_balance = doc.to_dict().get('tokens', 0)
            new_balance = current_balance + amount
            logger.info(f"💳 Token balance: {current_balance} -> {new_balance}")
        
        # Update tokens
        user_ref.update({
            'tokens': firestore.Increment(amount),
            'token_history': firestore.ArrayUnion([{
                'amount': amount,
                'type': reason,
                'timestamp': firestore.SERVER_TIMESTAMP
            }])
        })
        
        logger.info(f"✅ Tokens updated for user {user_id}")
        
    except Exception as e:
        logger.error(f"🚨 Error updating tokens: {str(e)}")
        raise

async def check_processed_event(event_id: str) -> bool:
    """Checks if Stripe webhook event was already processed"""
    try:
        logger.info(f"🔍 Checking processed event: {event_id}")
        event_ref = db.collection('processed_events').document(event_id)
        doc = event_ref.get()
        
        is_processed = doc.exists
        logger.info(f"✅ Event {event_id} processed status: {is_processed}")
        return is_processed
        
    except Exception as e:
        logger.error(f"🚨 Error checking processed event: {str(e)}")
        raise

async def mark_event_processed(event_id: str, event_type: str):
    """Marks Stripe webhook event as processed"""
    try:
        logger.info(f"📝 Marking event as processed: {event_id} ({event_type})")
        event_ref = db.collection('processed_events').document(event_id)
        
        event_ref.create({
            'event_id': event_id,
            'event_type': event_type,
            'processed_at': firestore.SERVER_TIMESTAMP,
            'expires_at': datetime.now() + timedelta(days=30)
        })
        
        logger.info(f"✅ Event marked as processed: {event_id}")
        
    except Exception as e:
        logger.error(f"🚨 Error marking event as processed: {str(e)}")
        raise
