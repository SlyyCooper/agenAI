import os
import json
from firebase_admin import credentials, initialize_app, firestore
from typing import Dict, Any, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
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
        initialize_app(cred)
        return firestore.client()
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise

def get_collection_schema(collection_ref) -> Dict[str, Any]:
    """Extract schema from a Firestore collection"""
    schema = {}
    docs = collection_ref.limit(10).stream()  # Sample first 10 documents
    
    for doc in docs:
        doc_data = doc.to_dict()
        for field, value in doc_data.items():
            if field not in schema:
                schema[field] = {
                    'type': type(value).__name__,
                    'nullable': value is None,
                    'example': str(value)[:100]  # Truncate long values
                }
    return schema

def verify_collection_schema(db, collection_name: str) -> Dict[str, Any]:
    """Verify schema for a specific collection"""
    try:
        collection_ref = db.collection(collection_name)
        schema = get_collection_schema(collection_ref)
        return {
            'collection': collection_name,
            'schema': schema,
            'document_count': len(list(collection_ref.limit(1000).stream()))
        }
    except Exception as e:
        logger.error(f"Error verifying collection {collection_name}: {e}")
        return {'error': str(e)}

def get_all_collections(db) -> List[str]:
    """Get all root collections in Firestore"""
    return [col.id for col in db.collections()]

def main():
    """Main verification process"""
    logger.info("Starting Firestore schema verification...")
    
    # Initialize Firebase
    db = initialize_firebase()
    
    # Get all collections
    collections = get_all_collections(db)
    logger.info(f"Found collections: {collections}")
    
    # Verify each collection
    results = {}
    for collection in collections:
        logger.info(f"Verifying collection: {collection}")
        results[collection] = verify_collection_schema(db, collection)
    
    # Save results
    output_file = '.memory/firestore_schema.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    logger.info(f"Schema verification complete. Results saved to {output_file}")
    
    # Print summary
    print("\nFirestore Database Schema Summary:")
    print("==================================")
    for collection, data in results.items():
        print(f"\nCollection: {collection}")
        if 'error' in data:
            print(f"Error: {data['error']}")
            continue
        print(f"Document count: {data['document_count']}")
        print("Fields:")
        for field, info in data['schema'].items():
            print(f"  - {field}: {info['type']}")

if __name__ == "__main__":
    main() 