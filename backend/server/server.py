import json
import os
import re
import time
from typing import Dict, List
from dotenv import load_dotenv
import stripe
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, File, UploadFile, Header, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import HTTPException
from backend.server.firebase import storage_routes
from backend.server.firebase.firebase import db, initialize_firebase
from backend.server.firebase import firestore_routes
from backend.server.firebase import stripe_routes
from backend.server.websocket_manager import WebSocketManager
from multi_agents.main import run_research_task
from gpt_researcher.document.document import DocumentLoader
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.server_utils import (
    get_config_dict,
    update_environment_variables,
    handle_file_upload,
    handle_file_deletion,
    execute_multi_agents,
    handle_websocket_communication,
    extract_command_data
)
import logging
from .tasks.storage_maintenance import init_maintenance_schedule

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class ResearchRequest(BaseModel):
    task: str
    report_type: str
    agent: str

class ConfigRequest(BaseModel):
    ANTHROPIC_API_KEY: str
    TAVILY_API_KEY: str
    LANGCHAIN_TRACING_V2: str
    LANGCHAIN_API_KEY: str
    OPENAI_API_KEY: str
    DOC_PATH: str
    RETRIEVER: str
    GOOGLE_API_KEY: str = ''
    GOOGLE_CX_KEY: str = ''
    BING_API_KEY: str = ''
    SEARCHAPI_API_KEY: str = ''
    SERPAPI_API_KEY: str = ''
    SERPER_API_KEY: str = ''
    SEARX_URL: str = ''

class ConfigUpdateRequest(BaseModel):
    llm_model: str = None
    fast_llm_model: str = None
    smart_llm_model: str = None
    fast_token_limit: int = None
    smart_token_limit: int = None
    browse_chunk_max_length: int = None
    summary_token_limit: int = None
    temperature: float = None
    max_search_results_per_query: int = None
    total_words: int = None
    report_format: str = None
    max_iterations: int = None
    max_subtopics: int = None
    report_source: str = None

# App initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Firebase
    initialize_firebase()
    
    # Initialize storage maintenance
    init_maintenance_schedule()
    
    yield

app = FastAPI(lifespan=lifespan)

# WebSocket manager
manager = WebSocketManager()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ 
        "https://gpt-researcher-costom.vercel.app",
        "https://www.tanalyze.app",
        "https://tanalyze.app",
        "https://agenai.app",
        "https://www.agenai.app",
        "http://agenai.app",
        "http://www.agenai.app",
        "https://orca-app-jfdlt.ondigitalocean.app",
        "http://localhost:3000"  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log detailed request information
    logger.info(f"""
    Request Details:
    - Method: {request.method}
    - URL: {request.url}
    - Path: {request.url.path}
    - Headers: {request.headers}
    - Client Host: {request.client.host if request.client else 'Unknown'}
    """)
    
    response = await call_next(request)
    duration = time.time() - start_time
    
    logger.info(f"""
    Response Details:
    - Status: {response.status_code}
    - Duration: {duration:.2f}s
    - Path: {request.url.path}
    """)
    
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": str(exc.detail),
            "path": request.url.path
        }
    )

# Constants
DOC_PATH = os.getenv("DOC_PATH", "./my-docs")

# Load environment variables
load_dotenv()

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Include routers
app.include_router(firestore_routes.router)
app.include_router(stripe_routes.router)
app.include_router(storage_routes.router)

# Routes
@app.get("/health")
async def health_check():
    status = {
        "status": "healthy",
        "timestamp": time.time(),
        "stripe_initialized": bool(stripe.api_key),
        "firebase_initialized": bool(db)
    }
    logger.info(f"Health check: {status}")
    return status

# WebSocket endpoint for real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    if websocket in manager.active_connections:
        try:
            await handle_websocket_communication(websocket, manager)
        except WebSocketDisconnect:
            await manager.disconnect(websocket)

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path_name: str):
    # Add specific handling for the common stripe_hook misrouting
    if path_name == "stripe_hook":
        logger.warning("""
        Deprecated Stripe webhook path accessed. 
        Please update webhook URL to: /api/stripe/webhook
        """)
        # Redirect to correct endpoint
        return JSONResponse(
            status_code=308,
            content={
                "detail": "This endpoint has moved to /api/stripe/webhook",
                "permanent_redirect": "/api/stripe/webhook"
            }
        )
