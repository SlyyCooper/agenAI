from firebase_admin import firestore
from backend.server.firebase_init import db

# Export commonly used Firestore constants
SERVER_TIMESTAMP = firestore.SERVER_TIMESTAMP
INCREMENT = firestore.Increment
DELETE_FIELD = firestore.DELETE_FIELD
ArrayUnion = firestore.ArrayUnion
ArrayRemove = firestore.ArrayRemove

# Export the initialized Firestore client
firestore_client = db

