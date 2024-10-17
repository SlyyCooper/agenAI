# This file serves as the main entry point for the backend server of our application.
# It sets up the FastAPI server, initializes Firebase Admin SDK, and defines all the API routes.

import os
import re
from typing import Dict, List
from dotenv import load_dotenv

# Firebase Admin SDK for server-side operations
import firebase_admin
from firebase_admin import credentials, firestore, auth

# FastAPI and related imports for building the API
from fastapi import Depends, HTTPException, status, FastAPI, Request, WebSocket, WebSocketDisconnect, File, UploadFile, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# Custom utility imports
from backend.server.utils.auth_utils import get_authenticated_user_id
from backend.server.server_utils import generate_report_files
from backend.server.utils import firebase_utils
from backend.server.websocket_manager import WebSocketManager
from multi_agents.main import run_research_task
from gpt_researcher.document.document import DocumentLoader
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.server_utils import (
    sanitize_filename, handle_start_command, handle_human_feedback,
    generate_report_files, send_file_paths, get_config_dict,
    update_environment_variables, handle_file_upload, handle_file_deletion,
    execute_multi_agents, handle_websocket_communication, extract_command_data
)
from backend.server.utils.firebase_utils import (
    create_user_profile,
    get_user_profile,
    update_user_profile,
    create_subscription,
    get_subscription,
    update_subscription,
    create_report,
    get_reports,
    delete_report,
    initialize_firebase
)
from backend.server.utils.stripe_utils import create_checkout_session, retrieve_session, create_payment_intent, handle_stripe_webhook

# Models for request validation
# These Pydantic models ensure that incoming requests have the correct structure

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

# Initialize the FastAPI application
app = FastAPI()

# Initialize Firebase Admin SDK for server-side operations
initialize_firebase()

# Set up static file serving and templating
app.mount("/site", StaticFiles(directory="./frontend"), name="site")
app.mount("/static", StaticFiles(directory="./frontend/static"), name="static")
templates = Jinja2Templates(directory="./frontend")

# Initialize WebSocket manager for real-time communication
manager = WebSocketManager()

# Utility function to sanitize filenames
def sanitize_filename(filename):
    return re.sub(r"[^\w\s-]", "", filename).strip()

# Set up CORS middleware to allow cross-origin requests from specified domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
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

# Constants
DOC_PATH = os.getenv("DOC_PATH", "./my-docs")

# Load environment variables
load_dotenv()

# API Routes

# Root route
@app.get("/")
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "report": None})

# Configuration route
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

# User profile routes
@app.post("/api/user_profile")
async def create_user_profile(user_data: dict, user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.create_user_profile(user_data, user_id)

@app.get("/api/user_profile/{user_id}")
async def get_user_profile(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.get_user_profile(user_id, authenticated_user_id)

@app.put("/api/user_profile/{user_id}")
async def update_user_profile(user_id: str, user_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.update_user_profile(user_id, user_data, authenticated_user_id)

# Subscription routes
@app.post("/api/subscription")
async def api_create_subscription(subscription_data: dict, user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.create_subscription(subscription_data, user_id)

@app.get("/api/subscription/{user_id}")
async def api_get_subscription(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.get_subscription(user_id, authenticated_user_id)

@app.put("/api/subscription/{user_id}")
async def api_update_subscription(user_id: str, subscription_data: dict, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.update_subscription(user_id, subscription_data, authenticated_user_id)

# Report routes
@app.post("/api/report")
async def api_create_report(report_data: dict, user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.create_report(report_data, user_id)

@app.get("/api/reports/{user_id}")
async def api_get_reports(user_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.get_reports(user_id, authenticated_user_id)

@app.delete("/api/report/{user_id}/{report_id}")
async def api_delete_report(user_id: str, report_id: str, authenticated_user_id: str = Depends(get_authenticated_user_id)):
    return await firebase_utils.delete_report(user_id, report_id, authenticated_user_id)

# Payment routes
@app.post("/api/checkout_sessions")
async def api_create_checkout_session(data: dict, user_id: str = Depends(get_authenticated_user_id)):
    return await create_checkout_session(data['plan'], data['amount'], data['success_url'], data['cancel_url'])

@app.get("/api/checkout_sessions/{session_id}")
async def api_get_checkout_session(session_id: str, user_id: str = Depends(get_authenticated_user_id)):
    session = await retrieve_session(session_id)
    return JSONResponse(content=session)

@app.post("/api/payment_intents")
async def api_create_payment_intent(data: dict, user_id: str = Depends(get_authenticated_user_id)):
    return await create_payment_intent(data['amount'])

@app.post("/api/stripe_hook")
async def api_stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    return await handle_stripe_webhook(payload, sig_header)

# WebSocket route for real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            if data.startswith("start"):
                await handle_start_command(websocket, data, manager)
            elif data.startswith("human_feedback"):
                await handle_human_feedback(data)
            else:
                print("Error: Unknown command or not enough parameters provided.")
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)
