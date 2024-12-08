"""
Main FastAPI server application
"""

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .firebase.stripe_routes import router as stripe_router
from .firebase.firestore_routes import router as firestore_router
from .firebase.storage_routes import router as storage_router
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgenAI API",
    description="API for AgenAI application",
    root_path="/backend"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "https://www.agenai.app",
    "https://agenai.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request details
    logger.info(f"📥 Request: {request.method} {request.url}")
    logger.info(f"📋 Headers: {dict(request.headers)}")
    
    try:
        # Get request body if it exists
        body = await request.body()
        if body:
            logger.info(f"📦 Body: {body.decode()}")
    except Exception as e:
        logger.warning(f"⚠️ Could not log request body: {str(e)}")
    
    response = await call_next(request)
    
    # Log response details
    process_time = time.time() - start_time
    logger.info(f"📤 Response: Status {response.status_code}")
    logger.info(f"⏱️ Process time: {process_time:.2f}s")
    
    return response

# Startup event logging
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting server...")
    
    # Log environment configuration
    logger.info("📝 Environment Configuration:")
    logger.info(f"🌐 CORS Origins: {origins}")
    logger.info(f"🔑 Firebase initialized: {bool(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))}")
    logger.info(f"💳 Stripe configured: {bool(os.getenv('STRIPE_SECRET_KEY'))}")
    
    # Log available routes
    logger.info("🛣️ Available routes:")
    for route in app.routes:
        logger.info(f"  {route.methods} {route.path}")

# Shutdown event logging
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Shutting down server...")

# Include routers
app.include_router(stripe_router)
app.include_router(firestore_router)
app.include_router(storage_router)

@app.get("/backend/subscription/status")
async def get_subscription_status(request: Request):
    """Redirect to the correct subscription status endpoint"""
    return RedirectResponse(url="/backend/api/stripe/subscription-status")

@app.get("/backend/usage/monthly")
async def get_monthly_usage(request: Request):
    """Get monthly usage statistics"""
    try:
        # Get authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return {"error": "No authorization header"}, 401

        # Extract token
        token = auth_header.split(' ')[1]
        
        # Verify Firebase token
        from .firebase.firebase import verify_firebase_token
        decoded_token = await verify_firebase_token(token)
        if not decoded_token:
            return {"error": "Invalid token"}, 401

        user_id = decoded_token['uid']
        
        # Get user's monthly usage from Firestore
        from .firebase.firestore_utils import get_user_data
        user_data = await get_user_data(user_id)
        
        # Calculate monthly usage
        monthly_usage = {
            "total_queries": user_data.get("total_queries", 0),
            "monthly_queries": user_data.get("monthly_queries", 0),
            "last_query_date": user_data.get("last_query_date", None),
            "subscription_type": user_data.get("subscription_type", "free")
        }
        
        return monthly_usage
        
    except Exception as e:
        logger.error(f"Error getting monthly usage: {str(e)}")
        return {"error": "Internal server error"}, 500

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("✅ Health check requested")
    return {"status": "healthy"}
