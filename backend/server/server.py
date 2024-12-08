"""
Main FastAPI server application
"""

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI()

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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("✅ Health check requested")
    return {"status": "healthy"}
