import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, storage
import google.cloud.storage

def verify_firebase_config():
    """Verify Firebase configuration and storage bucket access"""
    
    print("\n🔍 Verifying Firebase Configuration...")
    
    # Load environment variables
    load_dotenv()
    
    # Check required environment variables
    required_vars = [
        "FIREBASE_TYPE",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_PRIVATE_KEY_ID",
        "FIREBASE_PRIVATE_KEY",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_CLIENT_ID",
        "FIREBASE_AUTH_URI",
        "FIREBASE_TOKEN_URI",
        "FIREBASE_AUTH_PROVIDER_X509_CERT_URL",
        "FIREBASE_CLIENT_X509_CERT_URL"
    ]
    
    # Print current configuration (excluding sensitive data)
    print("\nCurrent Configuration:")
    print(f"Project ID: {os.getenv('FIREBASE_PROJECT_ID')}")
    print(f"Client Email: {os.getenv('FIREBASE_CLIENT_EMAIL')}")
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("\n❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    try:
        # Initialize Firebase with service account
        cred_dict = {
            "type": os.getenv("FIREBASE_TYPE"),
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
            "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
        }
        
        print("\nInitializing Firebase with service account...")
        cred = credentials.Certificate(cred_dict)
        
        # Initialize Firebase app
        try:
            firebase_admin.get_app()
        except ValueError:
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'tangents-94.appspot.com'
            })
        
        print("\nTesting direct Google Cloud Storage access...")
        storage_client = google.cloud.storage.Client.from_service_account_info(cred_dict)
        bucket = storage_client.bucket('tangents-94.appspot.com')
        
        # Test if bucket exists
        if bucket.exists():
            print(f"✅ Bucket exists: {bucket.name}")
        else:
            print("❌ Bucket does not exist")
            return False
        
        # Test bucket permissions
        print("\nTesting bucket permissions...")
        try:
            bucket.test_iam_permissions(['storage.objects.list'])
            print("✅ Has permission to list objects")
        except Exception as e:
            print(f"❌ Permission error: {str(e)}")
            return False
        
        # Try to list files
        print("\nAttempting to list files...")
        try:
            blobs = list(bucket.list_blobs(max_results=5))
            print(f"\nFound {len(blobs)} files:")
            for blob in blobs:
                print(f"   - {blob.name}")
        except Exception as e:
            print(f"❌ Error listing files: {str(e)}")
            return False
        
        print("\n✅ Firebase Storage configuration verified successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Firebase configuration error: {str(e)}")
        return False

if __name__ == "__main__":
    verify_firebase_config() 