import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
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
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
    "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
})
firebase_app = firebase_admin.initialize_app(cred)

# Initialize Firestore
db = firestore.client()

# Create a new user profile in Firestore
async def create_user_profile(user_id: str, email: str, name: str = None):
    user_ref = db.collection('users').document(user_id)
    user_data = {
        'email': email,
        'created_at': firestore.SERVER_TIMESTAMP,
        'last_login': firestore.SERVER_TIMESTAMP
    }
    if name:
        user_data['name'] = name
    user_ref.set(user_data)

# Update user data in Firestore
async def update_user_data(user_id: str, data: dict):
    user_ref = db.collection('users').document(user_id)
    user_ref.update(data)

# Increment a specific field in user data
async def increment_user_field(user_id: str, field: str, increment_by: int = 1):
    user_ref = db.collection('users').document(user_id)
    user_ref.update({field: firestore.Increment(increment_by)})

# Retrieve user data from Firestore
async def get_user_data(user_id: str):
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    return doc.to_dict() if doc.exists else None

# Verify Firebase token and manage user profile
async def verify_firebase_token(token: str):
    try:
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['uid']
        email = decoded_token.get('email', '')
        
        # Check if user exists in Firestore, if not, create profile
        user_data = await get_user_data(user_id)
        if not user_data:
            await create_user_profile(user_id, email)
        else:
            # Update last login
            await update_user_data(user_id, {'last_login': firestore.SERVER_TIMESTAMP})
        
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None

async def save_report_to_firestore(user_id: str, report: str, report_type: str, task: str):
    try:
        user_ref = db.collection('users').document(user_id)
        report_ref = user_ref.collection('reports').document()
        
        report_data = {
            'content': report,
            'type': report_type,
            'task': task,
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        report_ref.set(report_data)
        
        user_ref.update({
            'reports_generated': firestore.Increment(1)
        })
        
        return report_ref.id
    except Exception as e:
        print(f"Error saving report to Firestore: {e}")
        return None

async def get_user_reports(user_id: str, limit: int = 10):
    try:
        user_ref = db.collection('users').document(user_id)
        reports_ref = user_ref.collection('reports').order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
        
        reports = []
        for doc in reports_ref.stream():
            report_data = doc.to_dict()
            report_data['id'] = doc.id
            reports.append(report_data)
        
        return reports
    except Exception as e:
        print(f"Error fetching user reports: {e}")
        return []

async def update_user_subscription(user_id: str, subscription_data: dict):
    user_ref = db.collection('users').document(user_id)
    user_ref.update({
        'subscription': subscription_data,
        'last_updated': firestore.SERVER_TIMESTAMP
    })

async def record_one_time_payment(user_id: str, payment_data: dict):
    user_ref = db.collection('users').document(user_id)
    payments_ref = user_ref.collection('payments')
    payments_ref.add({
        **payment_data,
        'timestamp': firestore.SERVER_TIMESTAMP
    })

async def get_user_subscription(user_id: str):
    user_ref = db.collection('users').document(user_id)
    user_doc = user_ref.get()
    if user_doc.exists:
        return user_doc.to_dict().get('subscription')
    return None

async def get_user_payments(user_id: str, limit: int = 10):
    user_ref = db.collection('users').document(user_id)
    payments_ref = user_ref.collection('payments').order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
    return [payment.to_dict() for payment in payments_ref.stream()]
