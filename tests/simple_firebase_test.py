from dotenv import load_dotenv
import os
import firebase_admin
from firebase_admin import credentials, storage

def test_firebase():
    """Simple test to check Firebase setup"""
    
    print("\n🔍 STEP 1: Loading your Firebase credentials...")
    load_dotenv()
    
    # Get project ID to show which Firebase project we're connecting to
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    print(f"📂 Trying to connect to Firebase project: {project_id}")
    
    try:
        print("\n🔍 STEP 2: Setting up Firebase connection...")
        # Create credentials from your service account
        cred = credentials.Certificate({
            "type": os.getenv("FIREBASE_TYPE"),
            "project_id": project_id,
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n"),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
            "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
        })
        
        print("✅ Firebase credentials loaded successfully!")
        
        print("\n🔍 STEP 3: Connecting to Firebase...")
        # Initialize Firebase (if not already initialized)
        try:
            app = firebase_admin.get_app()
            print("✅ Firebase already initialized!")
        except ValueError:
            app = firebase_admin.initialize_app(cred, {
                'storageBucket': f"{project_id}.appspot.com"
            })
            print("✅ Firebase initialized successfully!")
        
        print("\n🔍 STEP 4: Testing Firebase Storage...")
        # Try to access storage
        bucket = storage.bucket()
        print(f"✅ Connected to storage bucket: {bucket.name}")
        
        # Try to list files
        print("\n🔍 STEP 5: Trying to list files in storage...")
        files = list(bucket.list_blobs(max_results=5))
        print(f"Found {len(files)} files in storage:")
        for file in files:
            print(f"   📄 {file.name}")
            
        print("\n✨ SUCCESS! Your Firebase Storage is working! ✨")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        print("\nTo fix this:")
        print("1. Make sure you've enabled Firebase Storage in your Firebase Console")
        print("2. Check that your service account has Storage Admin permissions")
        print("3. Verify your .env file has all the correct Firebase credentials")
        return False

if __name__ == "__main__":
    test_firebase() 