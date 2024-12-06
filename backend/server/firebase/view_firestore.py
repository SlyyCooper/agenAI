import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

def view_firestore_structure():
    # Initialize Firebase Admin with your service account
    cred = credentials.Certificate("frontend/nextjs/config/firebase/serviceAccountKey.json")
    try:
        firebase_admin.initialize_app(cred)
    except ValueError:
        # App already initialized
        pass
    
    db = firestore.client()
    
    def explore_collection(collection_ref, indent=0):
        """Recursively explore Firestore collections and documents"""
        collections = collection_ref.list_documents()
        
        for doc in collections:
            print("  " * indent + f"Document: {doc.id}")
            # Get document data
            doc_data = doc.get().to_dict()
            if doc_data:
                print("  " * (indent + 1) + "Fields:", list(doc_data.keys()))
            
            # Explore subcollections
            subcollections = doc.collections()
            for subcoll in subcollections:
                print("  " * (indent + 1) + f"Collection: {subcoll.id}")
                explore_collection(subcoll, indent + 2)

    # Get all root collections
    collections = db.collections()
    print("\nFirestore Database Structure:")
    print("============================")
    for collection in collections:
        print(f"\nRoot Collection: {collection.id}")
        explore_collection(collection)

if __name__ == "__main__":
    view_firestore_structure() 