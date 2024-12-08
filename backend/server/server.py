"""
Main FastAPI server application
"""

import logging
import os
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from .firebase.stripe_routes import router as stripe_router
from .firebase.firestore_routes import router as firestore_router
from .firebase.storage_routes import router as storage_router
from .websocket_manager import WebSocketManager
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AgenAI API",
    description="API for AgenAI application"
)

# Initialize WebSocket Manager
websocket_manager = WebSocketManager()

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
        if hasattr(route, "methods"):
            logger.info(f"  {route.methods} {route.path}")
        elif hasattr(route, "path"):
            logger.info(f"  WebSocket {route.path}")

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
            return {"error": "No authorization header", "status_code": 401}

        # Extract token
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return {"error": "Invalid authorization header format", "status_code": 401}
        
        # Verify Firebase token
        from .firebase.firebase import verify_firebase_token
        decoded_token = await verify_firebase_token(token)
        if not decoded_token:
            return {"error": "Invalid token", "status_code": 401}

        user_id = decoded_token['uid']
        
        # Get user's monthly usage from Firestore
        from .firebase.firestore_utils import get_user_data
        user_data = await get_user_data(user_id)
        if not user_data:
            return {"error": "User data not found", "status_code": 404}
        
        # Calculate monthly usage
        monthly_usage = {
            "total_queries": user_data.get("total_queries", 0),
            "monthly_queries": user_data.get("monthly_queries", 0),
            "last_query_date": user_data.get("last_query_date", None),
            "subscription_type": user_data.get("subscription_type", "free"),
            "status_code": 200
        }
        
        return monthly_usage
        
    except Exception as e:
        logger.error(f"Error getting monthly usage: {str(e)}")
        return {"error": "Internal server error", "status_code": 500}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("✅ Health check requested")
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for research generation"""
    try:
        await websocket_manager.connect(websocket)
        while True:
            try:
                data = await websocket.receive_json()
                if data.get("type") == "research":
                    task = data.get("task")
                    report_type = data.get("report_type", "detailed")
                    report_source = data.get("report_source", "web")
                    source_urls = data.get("source_urls", [])
                    tone = data.get("tone", "balanced")
                    headers = data.get("headers")
                    
                    # Start streaming research results
                    report = await websocket_manager.start_streaming(
                        task=task,
                        report_type=report_type,
                        report_source=report_source,
                        source_urls=source_urls,
                        tone=tone,
                        websocket=websocket,
                        headers=headers
                    )
                    
                    if report and report.get("user_id"):
                        # Deduct one token for the research generation
                        from .firebase.firestore_utils import update_user_tokens
                        await update_user_tokens(
                            report["user_id"], 
                            -1,  # Deduct 1 token
                            "Research generation"
                        )
                        
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {str(e)}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error processing request: {str(e)}"
                })
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        await websocket_manager.disconnect(websocket)
