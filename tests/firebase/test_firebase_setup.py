import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from firebase_admin.exceptions import FirebaseError
import requests
from typing import Dict, List, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FirebaseSetupValidator:
    def __init__(self):
        self.service_account_path = "frontend/nextjs/config/firebase/serviceAccountKey.json"
        self.env_path = ".env"
        self.frontend_env_path = "frontend/nextjs/.env.local"
        self.required_backend_env_vars = [
            "FIREBASE_SERVICE_ACCOUNT_KEY",
            "STRIPE_SECRET_KEY",
            "STRIPE_WEBHOOK_SECRET"
        ]
        self.required_frontend_env_vars = [
            "NEXT_PUBLIC_FIREBASE_API_KEY",
            "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
            "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
            "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
            "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
            "NEXT_PUBLIC_FIREBASE_APP_ID"
        ]
        self.db_schemas = {
            "users": {
                "required_fields": [
                    "created_at",
                    "tokens",
                    "one_time_purchase",
                    "has_access",
                    "token_history",
                    "last_login",
                    "stripe_customer_id",
                    "email",
                    "name"
                ]
            },
            "processed_events": {
                "required_fields": [
                    "event_type",
                    "event_id",
                    "completed_at",
                    "processed_at",
                    "processing_status"
                ]
            }
        }

    def check_service_account(self) -> bool:
        """Verify service account file exists and is valid JSON"""
        try:
            if not os.path.exists(self.service_account_path):
                logger.error(f"Service account file not found at {self.service_account_path}")
                return False
            
            with open(self.service_account_path) as f:
                service_account = json.load(f)
                
            required_fields = ["project_id", "private_key", "client_email"]
            for field in required_fields:
                if field not in service_account:
                    logger.error(f"Missing required field '{field}' in service account file")
                    return False
                    
            logger.info("✓ Service account file is valid")
            return True
        except json.JSONDecodeError:
            logger.error("Service account file is not valid JSON")
            return False
        except Exception as e:
            logger.error(f"Error checking service account: {str(e)}")
            return False

    def check_env_variables(self) -> bool:
        """Verify all required environment variables are set"""
        success = True
        
        # Check backend .env
        if not os.path.exists(self.env_path):
            logger.error(f"Backend .env file not found at {self.env_path}")
            success = False
        else:
            with open(self.env_path) as f:
                env_content = f.read()
                for var in self.required_backend_env_vars:
                    if var not in env_content:
                        logger.error(f"Missing required backend environment variable: {var}")
                        success = False
        
        # Check frontend .env.local
        if not os.path.exists(self.frontend_env_path):
            logger.error(f"Frontend .env file not found at {self.frontend_env_path}")
            success = False
        else:
            with open(self.frontend_env_path) as f:
                env_content = f.read()
                for var in self.required_frontend_env_vars:
                    if var not in env_content:
                        logger.error(f"Missing required frontend environment variable: {var}")
                        success = False
        
        if success:
            logger.info("✓ All required environment variables are set")
        return success

    def initialize_firebase(self) -> bool:
        """Initialize Firebase Admin SDK"""
        try:
            cred = credentials.Certificate(self.service_account_path)
            try:
                firebase_admin.initialize_app(cred)
            except ValueError:
                # App already initialized
                pass
            logger.info("✓ Firebase Admin SDK initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            return False

    def validate_db_schema(self) -> bool:
        """Validate database schema against expected structure"""
        try:
            db = firestore.client()
            success = True
            
            for collection_name, schema in self.db_schemas.items():
                # Get first document from collection
                docs = db.collection(collection_name).limit(1).stream()
                doc = next(docs, None)
                
                if doc is None:
                    logger.warning(f"No documents found in collection '{collection_name}'")
                    continue
                
                doc_data = doc.to_dict()
                for field in schema["required_fields"]:
                    if field not in doc_data:
                        logger.error(f"Missing required field '{field}' in collection '{collection_name}'")
                        success = False
            
            if success:
                logger.info("✓ Database schema validation passed")
            return success
        except Exception as e:
            logger.error(f"Error validating database schema: {str(e)}")
            return False

    def test_firestore_operations(self) -> bool:
        """Test basic Firestore operations"""
        try:
            db = firestore.client()
            
            # Test collection listing
            collections = db.collections()
            collection_ids = [collection.id for collection in collections]
            logger.info(f"Found collections: {collection_ids}")
            
            # Verify required collections exist
            for collection_name in self.db_schemas.keys():
                if collection_name not in collection_ids:
                    logger.error(f"Required collection '{collection_name}' not found")
                    return False
            
            logger.info("✓ Firestore operations test passed")
            return True
        except Exception as e:
            logger.error(f"Error testing Firestore operations: {str(e)}")
            return False

    def run_all_checks(self):
        """Run all validation checks"""
        checks = [
            ("Service Account", self.check_service_account),
            ("Environment Variables", self.check_env_variables),
            ("Firebase Initialization", self.initialize_firebase),
            ("Database Schema", self.validate_db_schema),
            ("Firestore Operations", self.test_firestore_operations)
        ]
        
        results = []
        for check_name, check_func in checks:
            logger.info(f"\nRunning {check_name} check...")
            success = check_func()
            results.append((check_name, success))
        
        # Print summary
        print("\n=== Firebase Setup Validation Summary ===")
        all_passed = True
        for check_name, success in results:
            status = "✓ PASS" if success else "✗ FAIL"
            print(f"{check_name}: {status}")
            if not success:
                all_passed = False
        
        if all_passed:
            print("\n🎉 All checks passed! Your Firebase setup is valid.")
        else:
            print("\n⚠️ Some checks failed. Please review the logs above for details.")

if __name__ == "__main__":
    validator = FirebaseSetupValidator()
    validator.run_all_checks() 