# This file contains utility functions for interacting with Firebase services
# It provides a centralized place for Firebase-related operations in our backend

import os
from fastapi import HTTPException, Depends
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
from backend.server.utils.auth_utils import get_authenticated_user_id
from cachetools import TTLCache
import asyncio

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase Admin SDK
def initialize_firebase():
    # Check if Firebase app is already initialized
    if not firebase_admin._apps:
        try:
            # Create a credential object using environment variables
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
            # Initialize the Firebase app with the credentials
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully")
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
    else:
        print("Firebase already initialized")

# Create a new user profile in Firestore
async def create_user_profile(user_data: dict, user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is creating their own profile
    if user_id != user_data['uid']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    user_ref = db.collection('users').document(user_data['uid'])
    try:
        await user_ref.set(user_data)
        return {"message": "User profile created successfully"}
    except Exception as e:
        print(f"Error creating user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user profile")

# Cache to store user profiles for 5 minutes to reduce database reads
user_profile_cache = TTLCache(maxsize=1000, ttl=300)

# Retrieve a user profile from Firestore or cache
async def get_user_profile(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is accessing their own profile
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    
    # Check cache first
    if user_id in user_profile_cache:
        return user_profile_cache[user_id]
    
    # If not in cache, fetch from Firestore
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    user_doc = await user_ref.get()
    if user_doc.exists:
        profile = user_doc.to_dict()
        # Store in cache for future requests
        user_profile_cache[user_id] = profile
        return profile
    return None

# Update an existing user profile in Firestore and cache
async def update_user_profile(user_id: str, user_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is updating their own profile
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    user_ref = db.collection('users').document(user_id)
    await user_ref.update(user_data)
    # Update cache if the user profile is cached
    if user_id in user_profile_cache:
        user_profile_cache[user_id].update(user_data)
    return {"message": "User profile updated successfully"}

# Create a new subscription in Firestore
async def create_subscription(subscription_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is creating their own subscription
    if authenticated_user_id != subscription_data['userId']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(subscription_data['userId'])
    await sub_ref.set(subscription_data)
    return {"message": "Subscription created successfully"}

# Retrieve a subscription from Firestore
async def get_subscription(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is accessing their own subscription
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(user_id)
    sub_doc = await sub_ref.get()
    if sub_doc.exists:
        return sub_doc.to_dict()
    return None

# Update an existing subscription in Firestore
async def update_subscription(user_id: str, subscription_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is updating their own subscription
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    sub_ref = db.collection('subscriptions').document(user_id)
    await sub_ref.update(subscription_data)
    return {"message": "Subscription updated successfully"}

# Create a new report in Firestore
async def create_report(report_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is creating their own report
    if authenticated_user_id != report_data['userId']:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    reports_ref = db.collection('users').document(report_data['userId']).collection('reports')
    await reports_ref.add(report_data)
    return {"message": "Report created successfully"}

# Retrieve all reports for a user from Firestore
async def get_reports(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is accessing their own reports
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    reports_ref = db.collection('users').document(user_id).collection('reports')
    reports = []
    async for doc in reports_ref.stream():
        report = doc.to_dict()
        report['id'] = doc.id  # Include the document ID for reference
        reports.append(report)
    return reports

# Delete a specific report from Firestore
async def delete_report(user_id: str, report_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    # Ensure the authenticated user is deleting their own report
    if authenticated_user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    db = firestore.client()
    report_ref = db.collection('users').document(user_id).collection('reports').document(report_id)
    await report_ref.delete()
    return {"message": "Report deleted successfully"}

# Export all functions for use in other parts of the application
__all__ = ['initialize_firebase', 'create_user_profile', 'get_user_profile', 'update_user_profile', 'create_subscription', 'get_subscription', 'update_subscription', 'create_report', 'get_reports', 'delete_report']
