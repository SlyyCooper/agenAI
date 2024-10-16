import os
from fastapi import HTTPException, Depends
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
from backend.server.utils.auth_utils import get_authenticated_user_id

# Load environment variables
load_dotenv()

def initialize_firebase():
    if not firebase_admin._apps:
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
                "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
                "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
            })
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully")
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
    else:
        print("Firebase already initialized")

async def create_user_profile(user_data: dict, user_id: str = Depends(get_authenticated_user_id)):
    if user_id != user_data['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    user_ref = db.collection('users').document(user_data['uid'])
    await user_ref.set(user_data)
    return {"message": "User profile created successfully"}

async def get_user_profile(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    user_doc = await user_ref.get()
    if user_doc.exists:
        return user_doc.to_dict()
    return None

async def update_user_profile(user_id: str, user_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    await user_ref.update(user_data)
    return {"message": "User profile updated successfully"}

async def create_subscription(subscription_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != subscription_data['userId']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(subscription_data['userId'])
    await sub_ref.set(subscription_data)
    return {"message": "Subscription created successfully"}

async def get_subscription(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(user_id)
    sub_doc = await sub_ref.get()
    if sub_doc.exists:
        return sub_doc.to_dict()
    return None

async def update_subscription(user_id: str, subscription_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(user_id)
    await sub_ref.update(subscription_data)
    return {"message": "Subscription updated successfully"}

async def create_report(report_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != report_data['userId']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    reports_ref = db.collection('users').document(report_data['userId']).collection('reports')
    await reports_ref.add(report_data)
    return {"message": "Report created successfully"}

async def get_reports(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    reports_ref = db.collection('users').document(user_id).collection('reports')
    reports = []
    async for doc in reports_ref.stream():
        report = doc.to_dict()
        report['id'] = doc.id  # Include the document ID
        reports.append(report)
    return reports

async def delete_report(user_id: str, report_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    report_ref = db.collection('users').document(user_id).collection('reports').document(report_id)
    await report_ref.delete()
    return {"message": "Report deleted successfully"}

# Make sure to include this line at the end of the file
__all__ = ['initialize_firebase', 'create_user_profile', 'get_user_profile', 'update_user_profile', 'create_subscription', 'get_subscription', 'update_subscription', 'create_report', 'get_reports', 'delete_report']
