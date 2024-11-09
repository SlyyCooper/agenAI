"""
@purpose: Initializes and configures Firebase services including Firestore and Storage
@prereq: Requires Firebase project credentials and Stripe API key in environment variables
@reference: Used by all Firebase-dependent services in the application
@maintenance: Requires periodic review of Firebase SDK and Stripe API version compatibility
"""

import os
import stripe
import logging
from firebase_admin import credentials, initialize_app, firestore, get_app, storage, auth
from dotenv import load_dotenv

"""
@purpose: Configure application-wide logging with standardized format
@invariant: Maintains consistent log level across all Firebase operations
@reference: Used by all Firebase utility functions for error reporting
"""
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

"""
@purpose: Load environment configuration from .env file
@prereq: .env file must exist in project root with required variables
@limitation: Environment variables cannot be modified at runtime
"""
load_dotenv()

"""
@purpose: Initialize Stripe payment processing capabilities
@prereq: STRIPE_SECRET_KEY must be set in environment variables
@reference: Used by payment processing routes in stripe_routes.py
@maintenance: Monitor for Stripe API version updates
"""
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

async def verify_firebase_token(token: str):
    """
    @purpose: Validates Firebase authentication tokens for protected routes
    @prereq: Token must be a valid Firebase JWT
    @example: decoded_user = await verify_firebase_token(request_token)
    @performance: O(1) verification using Firebase Admin SDK
    @limitation: Tokens expire after 1 hour by default
    @reference: Used by authentication middleware in all protected routes
    
    Args:
        token (str): Firebase JWT token from client request
        
    Returns:
        dict: Decoded token payload if valid, None if invalid
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        return None

def initialize_firebase():
    """
    @purpose: Initialize Firebase Admin SDK and return Firestore client
    @invariant: Only one Firebase app instance will be created
    @limitation: Requires valid Firebase service account credentials
    @performance: One-time initialization cost, subsequent calls return existing instance
    """
    try:
        # @purpose: Attempt to get existing Firebase app instance
        app = get_app()
    except ValueError:
        try:
            # @purpose: Create new Firebase app instance with service account credentials
            cred = credentials.Certificate({
                "type": os.getenv("FIREBASE_TYPE"), 
                "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
                "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
                "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
                "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
                "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
                "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
            })
            app = initialize_app(cred)
        except Exception as e:
            print(f"Failed to initialize Firebase: {str(e)}")
            raise
    return firestore.client()

# @purpose: Initialize global Firestore client
db = initialize_firebase()

# @purpose: Export commonly used Firestore constants for data operations
# @reference: Used throughout application for consistent Firestore operations
SERVER_TIMESTAMP = firestore.SERVER_TIMESTAMP
INCREMENT = firestore.Increment
DELETE_FIELD = firestore.DELETE_FIELD
ArrayUnion = firestore.ArrayUnion
ArrayRemove = firestore.ArrayRemove

# @purpose: Export initialized Firestore client for direct access
firestore_client = db

def initialize_storage():
    """
    @purpose: Initialize Firebase Storage bucket
    @prereq: FIREBASE_STORAGE_BUCKET must be set in environment
    @limitation: Requires Firebase Storage to be enabled in project
    """
    try:
        bucket = storage.bucket(os.getenv("FIREBASE_STORAGE_BUCKET"))
        return bucket
    except Exception as e:
        print(f"Failed to initialize Firebase Storage: {str(e)}")
        raise

# @purpose: Export initialized storage bucket for file operations
storage_bucket = initialize_storage()