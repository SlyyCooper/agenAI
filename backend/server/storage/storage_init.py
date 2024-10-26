import os
from firebase_admin import storage
from backend.server.firebase.firebase_init import db
from dotenv import load_dotenv

load_dotenv()

def initialize_storage():
    try:
        bucket = storage.bucket(os.getenv("FIREBASE_STORAGE_BUCKET"))
        return bucket
    except Exception as e:
        print(f"Failed to initialize Firebase Storage: {str(e)}")
        raise

# Export the initialized storage bucket
storage_bucket = initialize_storage()
