from backend.server.firestore.firestore_init import db, SERVER_TIMESTAMP
import logging
from typing import Literal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
SUBSCRIPTION_MONTHLY_TOKENS = 25
ONE_TIME_PURCHASE_TOKENS = 5

# Token operation types
TokenOperationType = Literal["subscription", "subscription_renewal", "purchase", "usage"]

TOKEN_OPERATION_SUBSCRIPTION: TokenOperationType = "subscription"
TOKEN_OPERATION_RENEWAL: TokenOperationType = "subscription_renewal"
TOKEN_OPERATION_PURCHASE: TokenOperationType = "purchase"
TOKEN_OPERATION_USAGE: TokenOperationType = "usage"

async def add_tokens(user_id: str, amount: int, reason: str = "purchase"):
    """Add tokens to a user's account."""
    try:
        user_ref = db.collection('users').document(user_id)
        
        update_data = {
            'tokens': db.Increment(amount),
            'token_history': db.ArrayUnion([{
                'amount': amount,
                'type': reason,
                'timestamp': SERVER_TIMESTAMP
            }])
        }
        
        user_ref.update(update_data)
        logger.info(f"Added {amount} tokens to user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error adding tokens: {str(e)}")
        raise

async def use_tokens(user_id: str, amount: int, reason: str = "usage"):
    """Use tokens from a user's account."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_data = user_ref.get().to_dict()
        
        if user_data['tokens'] < amount:
            raise ValueError("Insufficient tokens")
            
        update_data = {
            'tokens': db.Increment(-amount),
            'token_history': db.ArrayUnion([{
                'amount': -amount,
                'type': reason,
                'timestamp': SERVER_TIMESTAMP
            }])
        }
        
        user_ref.update(update_data)
        logger.info(f"Used {amount} tokens from user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error using tokens: {str(e)}")
        raise

async def get_token_balance(user_id: str) -> int:
    """Get the current token balance for a user."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_data = user_ref.get().to_dict()
        return user_data.get('tokens', 0)
    except Exception as e:
        logger.error(f"Error getting token balance: {str(e)}")
        raise

async def get_token_history(user_id: str) -> list:
    """Get the token transaction history for a user."""
    try:
        user_ref = db.collection('users').document(user_id)
        user_data = user_ref.get().to_dict()
        return user_data.get('token_history', [])
    except Exception as e:
        logger.error(f"Error getting token history: {str(e)}")
        raise
