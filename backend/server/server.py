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
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import HTTPException
from backend.server.stripe.stripe_utils import initialize_stripe
from backend.server.firebase.firebase_init import db, initialize_firebase
from backend.server.routes import user_routes, stripe_routes, storage_routes
from backend.server.server_utils import generate_report_files
from backend.server.websocket_manager import WebSocketManager
from multi_agents.main import run_research_task
from gpt_researcher.document.document import DocumentLoader
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.server_utils import (
    get_config_dict, update_environment_variables, handle_file_upload, handle_file_deletion,
    execute_multi_agents, handle_websocket_communication
)
import logging

# Add at the top of the file
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

    # Define all the fields you want to update
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
    os.makedirs("outputs", exist_ok=True)
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
    os.makedirs(DOC_PATH, exist_ok=True)
    initialize_firebase()
    initialize_stripe()
    yield

app = FastAPI(lifespan=lifespan)

# Static files and templates
app.mount("/site", StaticFiles(directory="./frontend"), name="site")
app.mount("/static", StaticFiles(directory="./frontend/static"), name="static")
templates = Jinja2Templates(directory="./frontend")

# WebSocket manager
manager = WebSocketManager()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[ # allow_origins=["http://localhost:3000"] for local testing
        "https://gpt-researcher-costom.vercel.app",
        "https://www.tanalyze.app",
        "https://tanalyze.app",
        "https://agenai.app",
        "https://www.agenai.app",
        "http://agenai.app",
        "http://www.agenai.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    print(f"Request: {request.method} {request.url.path} - Status: {response.status_code} - Duration: {duration:.2f}s")
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
app.include_router(user_routes.router)
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

@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "report": None})

@app.get("/getConfig")
async def get_config(
    langchain_api_key: str = Header(None),
    openai_api_key: str = Header(None),
    tavily_api_key: str = Header(None),
    google_api_key: str = Header(None),
    google_cx_key: str = Header(None),
    bing_api_key: str = Header(None),
    searchapi_api_key: str = Header(None),
    serpapi_api_key: str = Header(None),
    serper_api_key: str = Header(None),
    searx_url: str = Header(None)
):
    return get_config_dict(
        langchain_api_key, openai_api_key, tavily_api_key,
        google_api_key, google_cx_key, bing_api_key,
        searchapi_api_key, serpapi_api_key, serper_api_key, searx_url
    )
# List all files in DOC_PATH directory
@app.get("/files/")
async def list_files():
    files = os.listdir(DOC_PATH)
    print(f"Files in {DOC_PATH}: {files}")
    return {"files": files}

# Execute multiple research agents in parallel
@app.post("/api/multi_agents") 
async def run_multi_agents():
    return await execute_multi_agents(manager)

# Update environment configuration
@app.post("/setConfig")
async def set_config(config: ConfigRequest):
    update_environment_variables(config.dict())
    return {"message": "Config updated successfully"}

# Upload file to DOC_PATH directory
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    return await handle_file_upload(file, DOC_PATH)
# Delete file from DOC_PATH directory
@app.delete("/files/{filename}")
async def delete_file(filename: str):
    return await handle_file_deletion(filename, DOC_PATH)

# WebSocket endpoint for real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    if websocket in manager.active_connections:
        try:
            await handle_websocket_communication(websocket, manager)
        except WebSocketDisconnect:
            await manager.disconnect(websocket)
