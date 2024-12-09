"""
@module: stripe_webhook_handler.py
@purpose: Manages Stripe webhook event processing with proper idempotency and payment state management
@prereq: Requires configured Stripe API, Firebase Admin SDK, and environment variables
@maintainer: Your Team Name
"""

import os
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from .firebase import db, firestore
import stripe
import logging
from functools import wraps
from google.cloud.firestore_v1.base_client import DocumentSnapshot
from google.api_core import exceptions
from google.cloud.firestore import ArrayUnion

# Configure logging
logger = logging.getLogger(__name__)

class PaymentStatus(str, Enum):
    """Payment status enumeration for consistent state management"""
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    REFUNDED = 'refunded'

class SubscriptionStatus(str, Enum):
    """Subscription status enumeration"""
    ACTIVE = 'active'
    CANCELED = 'canceled'
    PAST_DUE = 'past_due'
    INCOMPLETE = 'incomplete'

def ensure_idempotency(func):
    """
    Decorator to ensure webhook idempotency using Firestore
    """
    @wraps(func)
    async def wrapper(event: Dict[str, Any], *args, **kwargs):
        event_id = event['id']
        processed_events_ref = db.collection('processed_events').document(event_id)

        try:
            # Try to create the event document - will fail if already exists
            processed_events_ref.create({
                'event_id': event_id,
                'event_type': event['type'],
                'processed_at': firestore.SERVER_TIMESTAMP,
                'processing_status': 'started'
            })
        except exceptions.AlreadyExists:
            logger.info(f"Event {event_id} already processed")
            return JSONResponse(content={"status": "success", "reason": "already_processed"})

        try:
            # Process the event
            result = await func(event, *args, **kwargs)
            
            # Mark event as successfully processed
            processed_events_ref.update({
                'processing_status': 'completed',
                'completed_at': firestore.SERVER_TIMESTAMP
            })
            
            return result
        except Exception as e:
            # Mark event as failed
            processed_events_ref.update({
                'processing_status': 'failed',
                'error': str(e),
                'failed_at': firestore.SERVER_TIMESTAMP
            })
            raise

    return wrapper

class PaymentProcessor:
    """Handles all payment-related state transitions and database updates"""
    
    def __init__(self, db_client):
        self.db = db_client
        
    async def create_payment_record(self, payment_id: str, user_id: str, amount: int,
                                  payment_type: str) -> bool:
        """
        Creates a new payment record with proper locking
        Returns: bool indicating if payment record was created
        """
        payment_ref = self.db.collection('payments').document(payment_id)
        
        @firestore.transactional
        def create_in_transaction(transaction, payment_ref):
            payment_doc = transaction.get(payment_ref)
            if payment_doc.exists:
                return False
                
            transaction.set(payment_ref, {
                'payment_id': payment_id,
                'user_id': user_id,
                'amount': amount,
                'payment_type': payment_type,
                'status': PaymentStatus.PENDING.value,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            return True
            
        return create_in_transaction(self.db.transaction(), payment_ref)
        
    async def update_payment_status(self, payment_id: str, 
                                  status: PaymentStatus,
                                  metadata: Optional[Dict] = None) -> None:
        """Updates payment status with optional metadata"""
        payment_ref = self.db.collection('payments').document(payment_id)
        
        # Check if document exists
        doc = payment_ref.get()
        if not doc.exists:
            # Create it if it doesn't exist
            payment_ref.set({
                'payment_id': payment_id,
                'status': status.value,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
        else:
            # Update if it exists
            update_data = {
                'status': status.value,
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            if metadata:
                update_data['metadata'] = metadata
            payment_ref.update(update_data)

class UserSubscriptionManager:
    """Manages user subscription states and updates"""
    
    def __init__(self, db_client):
        self.db = db_client
        
    async def update_subscription(self, user_id: str, subscription: Dict[str, Any]) -> None:
        """Updates user subscription status and details"""
        user_ref = self.db.collection('users').document(user_id)
        
        update_data = {
            'subscription_status': subscription['status'],
            'subscription_id': subscription['id'],
            'subscription_end_date': datetime.fromtimestamp(
                subscription['current_period_end']
            ).isoformat(),
            'has_access': subscription['status'] == SubscriptionStatus.ACTIVE.value,
            'last_updated': firestore.SERVER_TIMESTAMP
        }
        
        user_ref.update(update_data)

@ensure_idempotency
async def handle_stripe_webhook(event: Dict[str, Any]) -> JSONResponse:
    """
    Main webhook handler with proper idempotency and error handling
    """
    try:
        event_type = event.get('type')
        if not event_type:
            logger.error("Missing event type in webhook payload")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Missing event type"}
            )

        # Initialize handlers
        payment_processor = PaymentProcessor(db)
        subscription_manager = UserSubscriptionManager(db)
        
        handlers = {
            'checkout.session.completed': handle_checkout_session,
            'customer.subscription.updated': handle_subscription_updated,
            'customer.subscription.deleted': handle_subscription_deleted,
            'invoice.paid': handle_invoice_paid,
            'invoice.payment_failed': handle_invoice_payment_failed,
            # Add these new handlers if needed
            'payment_intent.created': None,  # Ignore or handle
            'mandate.updated': None,         # Ignore or handle
            'charge.succeeded': None         # Ignore or handle
        }
        
        handler = handlers.get(event_type)
        if handler:
            event_data = event.get('data', {}).get('object')
            if not event_data:
                raise ValueError("Missing event data object")
                
            result = await handler(
                event_data,
                payment_processor,
                subscription_manager
            )
            logger.info(f"✅ Successfully handled {event_type}")
            return JSONResponse(content={"status": "success", "result": result})
        else:
            # For explicitly ignored events (handler is None)
            if event_type in handlers:
                logger.info(f"Ignoring known event type: {event_type}")
                return JSONResponse(content={"status": "ignored", "type": "known_ignored_event"})
            # For unknown events
            else:
                logger.info(f"Skipping unhandled event type: {event_type}")
                return JSONResponse(content={"status": "ignored", "type": "unknown_event"})
            
    except ValueError as ve:
        logger.error(f"Validation error in webhook: {str(ve)}")
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": str(ve)}
        )
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Internal server error"}
        )

async def handle_checkout_session(
    session: Dict[str, Any],
    payment_processor: PaymentProcessor,
    subscription_manager: UserSubscriptionManager
) -> Dict[str, Any]:
    """
    Handles successful checkout sessions with proper error handling and idempotency
    """
    user_id = session.get('metadata', {}).get('user_id')
    if not user_id:
        raise ValueError("Missing user_id in session metadata")
        
    try:
        if session['mode'] == 'payment':
            payment_created = await payment_processor.create_payment_record(
                payment_id=session['payment_intent'],
                user_id=user_id,
                amount=session['amount_total'],
                payment_type='one_time'
            )
            
            if not payment_created:
                logger.info(f"Payment {session['payment_intent']} already processed")
                return {"status": "already_processed"}
            
            # Add 5 tokens and update access status
            user_ref = db.collection('users').document(user_id)
            
            def update_user_transaction(transaction):
                user_doc = user_ref.get(transaction=transaction)
                user_data = user_doc.to_dict()
                new_token_balance = (user_data.get('tokens', 0) + 5)
                
                update_data = {
                    'tokens': new_token_balance,
                    'has_access': True,
                    'one_time_purchase': (new_token_balance > 0 and user_data.get('subscription_status') != 'active'),
                    'token_history': ArrayUnion([{
                        'amount': 5,
                        'type': 'one_time_purchase',
                        'timestamp': firestore.SERVER_TIMESTAMP
                    }]),
                    'last_updated': firestore.SERVER_TIMESTAMP
                }
                transaction.update(user_ref, update_data)
            
            db.transaction().transaction(update_user_transaction)
            
        elif session['mode'] == 'subscription':
            subscription = stripe.Subscription.retrieve(session['subscription'])
            await subscription_manager.update_subscription(user_id, subscription)
            
            user_ref = db.collection('users').document(user_id)
            
            def update_subscription_transaction(transaction):
                user_doc = user_ref.get(transaction=transaction)
                user_data = user_doc.to_dict()
                new_token_balance = (user_data.get('tokens', 0) + 20)
                
                update_data = {
                    'tokens': new_token_balance,
                    'has_access': True,
                    'subscription_status': 'active',
                    'one_time_purchase': False,
                    'token_history': ArrayUnion([{
                        'amount': 20,
                        'type': 'subscription_purchase',
                        'timestamp': firestore.SERVER_TIMESTAMP
                    }]),
                    'last_updated': firestore.SERVER_TIMESTAMP
                }
                transaction.update(user_ref, update_data)
            
            db.transaction().transaction(update_subscription_transaction)
            
        return {"status": "success", "mode": session['mode']}
        
    except Exception as e:
        logger.error(f"Error handling checkout session: {str(e)}")
        # Update payment status to failed if applicable
        if session['mode'] == 'payment':
            await payment_processor.update_payment_status(
                session['payment_intent'],
                PaymentStatus.FAILED,
                {'error': str(e)}
            )
        raise

async def handle_subscription_updated(
    subscription: Dict[str, Any],
    payment_processor: PaymentProcessor,
    subscription_manager: UserSubscriptionManager
) -> Dict[str, Any]:
    """Handles subscription update events"""
    user_id = subscription['metadata'].get('user_id')
    if not user_id:
        raise ValueError("Missing user_id in subscription metadata")
        
    await subscription_manager.update_subscription(user_id, subscription)
    return {"status": "success"}

async def handle_subscription_deleted(
    subscription: Dict[str, Any],
    payment_processor: PaymentProcessor,
    subscription_manager: UserSubscriptionManager
) -> Dict[str, Any]:
    """Handles subscription cancellation events"""
    user_id = subscription['metadata'].get('user_id')
    if not user_id:
        raise ValueError("Missing user_id in subscription metadata")
        
    user_ref = db.collection('users').document(user_id)
    
    def update_subscription_status(transaction):
        user_doc = user_ref.get(transaction=transaction)
        user_data = user_doc.to_dict()
        token_balance = user_data.get('tokens', 0)
        
        update_data = {
            'subscription_status': SubscriptionStatus.CANCELED.value,
            'has_access': token_balance > 0,
            'one_time_purchase': token_balance > 0,
            'subscription_end_date': datetime.fromtimestamp(
                subscription['current_period_end']
            ).isoformat(),
            'last_updated': firestore.SERVER_TIMESTAMP
        }
        transaction.update(user_ref, update_data)
    
    db.transaction().transaction(update_subscription_status)
    
    return {"status": "success"}

async def handle_invoice_paid(
    invoice: Dict[str, Any],
    payment_processor: PaymentProcessor,
    subscription_manager: UserSubscriptionManager
) -> Dict[str, Any]:
    """Handles successful invoice payments"""
    user_id = invoice['metadata'].get('user_id')
    if not user_id:
        raise ValueError("Missing user_id in invoice metadata")
        
    subscription = stripe.Subscription.retrieve(invoice['subscription'])
    await subscription_manager.update_subscription(user_id, subscription)
    
    # Create payment record
    await payment_processor.create_payment_record(
        payment_id=invoice['payment_intent'],
        user_id=user_id,
        amount=invoice['amount_paid'],
        payment_type='subscription'
    )
    
    return {"status": "success"}

async def handle_invoice_payment_failed(
    invoice: Dict[str, Any],
    payment_processor: PaymentProcessor,
    subscription_manager: UserSubscriptionManager
) -> Dict[str, Any]:
    """Handles failed invoice payments"""
    user_id = invoice['metadata'].get('user_id')
    if not user_id:
        raise ValueError("Missing user_id in invoice metadata")
        
    user_ref = db.collection('users').document(user_id)
    user_ref.update({
        'subscription_status': SubscriptionStatus.PAST_DUE.value,
        'last_updated': firestore.SERVER_TIMESTAMP
    })
    
    return {"status": "success"}