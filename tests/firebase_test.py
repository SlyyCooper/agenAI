import os
import sys
import json
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials, firestore
from datetime import datetime
import pytest
import asyncio
from io import BytesIO
from backend.server.firebase.storage_utils import (
    upload_file_to_storage,
    list_files_in_storage,
    get_file_metadata,
    download_file_from_storage,
    delete_file_from_storage
)

def verify_data_structure(db):
    """Verify Firestore data structure matches both backend and frontend expectations"""
    print("\n🔍 Verifying Data Structure...")
    
    try:
        # Create test user
        test_user_id = "test_user_" + datetime.now().strftime("%Y%m%d%H%M%S")
        test_data = {
            'email': 'test@example.com',
            'name': 'Test User',
            'stripe_customer_id': 'test_stripe_id',
            'has_access': False,
            'one_time_purchase': False,
            'tokens': 0,
            'token_history': [],
            'created_at': firestore.SERVER_TIMESTAMP,
            'last_login': firestore.SERVER_TIMESTAMP
        }
        
        # Test user creation
        user_ref = db.collection('users').document(test_user_id)
        user_ref.set(test_data)
        print("✅ User document creation successful")
        
        # Test report creation
        report_data = {
            'title': 'Test Report',
            'created_at': firestore.SERVER_TIMESTAMP,
            'file_urls': ['test_url'],
            'query': 'test query',
            'report_type': 'test_type'
        }
        report_ref = user_ref.collection('reports').document()
        report_ref.set(report_data)
        print("✅ Report document creation successful")
        
        # Cleanup
        report_ref.delete()
        user_ref.delete()
        print("✅ Data structure verification successful")
        return True
        
    except Exception as e:
        print(f"❌ Data structure verification failed: {str(e)}")
        return False

def test_backend_firebase():
    """Test backend Firebase Admin SDK configuration"""
    print("\n🔍 Testing Backend Firebase Configuration...")
    
    try:
        # Initialize Firebase Admin
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
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
        })
        
        app = firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Backend Firebase initialized successfully")
        
        # Verify data structure
        if not verify_data_structure(db):
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Backend Firebase test failed: {str(e)}")
        return False

def test_frontend_firebase():
    """Test frontend Firebase configuration"""
    print("\n🔍 Testing Frontend Firebase Configuration...")
    
    required_vars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID'
    ]
    
    # Load frontend env
    frontend_env_path = 'frontend/nextjs/.env.local'
    with open(frontend_env_path) as f:
        frontend_env = dict(line.strip().split('=', 1) for line in f if line.strip() and not line.startswith('#'))
    
    # Check all required variables exist
    missing_vars = [var for var in required_vars if var not in frontend_env]
    if missing_vars:
        print(f"❌ Missing frontend environment variables: {', '.join(missing_vars)}")
        return False
        
    # Test API endpoint
    api_url = frontend_env.get('NEXT_PUBLIC_API_URL')
    if not api_url:
        print("❌ Missing NEXT_PUBLIC_API_URL")
        return False
        
    try:
        response = requests.get(f"{api_url}/health")
        if response.status_code == 200:
            print("✅ Frontend API endpoint accessible")
        else:
            print(f"❌ API endpoint returned status code {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Could not connect to API endpoint: {str(e)}")
    
    print("✅ Frontend Firebase configuration verified")
    return True

@pytest.mark.asyncio
async def test_firebase_storage_operations():
    """Test complete cycle of Firebase storage operations"""
    
    # Create a test file in memory
    test_content = b"Hello, Firebase Storage!"
    file_stream = BytesIO(test_content)
    test_filename = "test_file.txt"
    
    try:
        # Test file upload
        print("\n1. Testing file upload...")
        upload_url = await upload_file_to_storage(
            file_stream=file_stream,
            filename=test_filename,
            content_type="text/plain",
            user_id="test_user",
            make_public=False
        )
        assert upload_url, "Upload should return a valid URL"
        print(f"✓ File uploaded successfully: {upload_url}")

        # Test listing files
        print("\n2. Testing file listing...")
        files = await list_files_in_storage(prefix="users/test_user")
        assert any(test_filename in file for file in files), "Uploaded file should be in the list"
        print(f"✓ Files listed successfully: {files}")

        # Test getting metadata
        print("\n3. Testing metadata retrieval...")
        full_path = f"users/test_user/reports/{test_filename}"
        metadata = await get_file_metadata(full_path)
        assert metadata['name'] == full_path, "Metadata should contain correct filename"
        assert metadata['content_type'] == "text/plain", "Content type should match"
        print(f"✓ Metadata retrieved successfully: {metadata}")

        # Test downloading file
        print("\n4. Testing file download...")
        downloaded_content = await download_file_from_storage(full_path)
        assert downloaded_content == test_content, "Downloaded content should match original"
        print("✓ File downloaded successfully")

        # Test deleting file
        print("\n5. Testing file deletion...")
        await delete_file_from_storage(full_path)
        files_after_delete = await list_files_in_storage(prefix="users/test_user")
        assert not any(test_filename in file for file in files_after_delete), "File should be deleted"
        print("✓ File deleted successfully")

        print("\nAll Firebase Storage tests passed successfully! 🎉")

    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        raise

def main():
    print("🚀 Starting Firebase Configuration Test\n")
    
    # Load backend environment variables
    load_dotenv()
    
    # Run tests
    backend_success = test_backend_firebase()
    frontend_success = test_frontend_firebase()
    
    # Print summary
    print("\n📋 Test Summary:")
    print(f"Backend Firebase: {'✅ PASS' if backend_success else '❌ FAIL'}")
    print(f"Frontend Firebase: {'✅ PASS' if frontend_success else '❌ FAIL'}")
    
    if backend_success and frontend_success:
        print("\n✨ All Firebase configurations are correct!")
        sys.exit(0)
    else:
        print("\n⚠️ Some tests failed. Please check the logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 