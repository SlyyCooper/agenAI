from dotenv import load_dotenv
import os
import firebase_admin
from firebase_admin import credentials, storage
from io import BytesIO

def test_download():
    """Test downloading files from Firebase Storage"""
    
    print("\n📥 Testing file download from Firebase Storage...")
    
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
        
        # Get bucket
        print("\n1. Connecting to storage bucket...")
        bucket = storage.bucket()
        
        # List available files
        print("\n2. Listing available files:")
        files = list(bucket.list_blobs(prefix="test/"))
        if not files:
            print("❌ No files found in the test directory!")
            return False
            
        for file in files:
            print(f"   📄 {file.name}")
        
        # Download the test file we uploaded earlier
        print("\n3. Downloading test file...")
        blob = bucket.blob("test/hello.txt")
        
        # Download to memory
        print("\n4. Reading file content...")
        content = blob.download_as_bytes()
        print(f"\n📄 File content:")
        print("-" * 40)
        print(content.decode('utf-8'))
        print("-" * 40)
        
        # Download to a local file
        print("\n5. Saving file locally...")
        local_filename = "downloaded_test.txt"
        blob.download_to_filename(local_filename)
        print(f"✅ File saved locally as: {local_filename}")
        
        # Read local file to verify
        print("\n6. Verifying local file content:")
        with open(local_filename, 'r') as f:
            local_content = f.read()
            print("-" * 40)
            print(local_content)
            print("-" * 40)
        
        # Clean up local file
        os.remove(local_filename)
        print("\n7. Cleaned up local test file")
        
        print("\n✨ SUCCESS! File download tests completed! ✨")
        return True
        
    except Exception as e:
        print(f"\n❌ Download failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_download() 