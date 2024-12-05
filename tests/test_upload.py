from dotenv import load_dotenv
import os
from io import BytesIO
import firebase_admin
from firebase_admin import credentials, storage

def test_upload():
    """Test uploading a file to Firebase Storage"""
    
    print("\n📤 Testing file upload to Firebase Storage...")
    
    # Load credentials
    load_dotenv()
    
    try:
        # Initialize Firebase if not already initialized
        try:
            app = firebase_admin.get_app()
        except ValueError:
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
            app = firebase_admin.initialize_app(cred, {
                'storageBucket': f"{os.getenv('FIREBASE_PROJECT_ID')}.appspot.com"
            })
        
        # Create a test file in memory
        print("\n1. Creating test file...")
        test_content = b"Hello, Firebase Storage! This is a test file."
        file_stream = BytesIO(test_content)
        
        # Get bucket and create blob
        print("\n2. Connecting to storage bucket...")
        bucket = storage.bucket()
        blob = bucket.blob("test/hello.txt")
        
        # Upload the file
        print("\n3. Uploading file...")
        blob.upload_from_file(file_stream, content_type='text/plain')
        
        # Make it public and get URL
        print("\n4. Making file public and getting URL...")
        blob.make_public()
        
        print(f"\n✅ Success! File uploaded to: {blob.public_url}")
        
        # List files to verify
        print("\n5. Verifying files in storage:")
        files = list(bucket.list_blobs(prefix="test/"))
        for file in files:
            print(f"   📄 {file.name} - {file.public_url}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Upload failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_upload() 