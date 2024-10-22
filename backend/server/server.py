import json
import os
from typing import Dict, List
from dotenv import load_dotenv
import stripe

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, File, UploadFile, Header, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import HTTPException

from backend.server.websocket_manager import WebSocketManager
from multi_agents.main import run_research_task
from gpt_researcher.document.document import DocumentLoader
from gpt_researcher.orchestrator.actions import stream_output
from backend.server.server_utils import (
    sanitize_filename, handle_start_command, handle_human_feedback,
    send_file_paths, get_config_dict,
    handle_file_upload, handle_file_deletion,
    execute_multi_agents, handle_websocket_communication
)
from backend.server.firebase_utils import (
    verify_firebase_token, get_user_data, update_user_data,
    get_user_reports, increment_user_field
)
from backend.server.stripe_utils import (
    create_stripe_customer, create_checkout_session, handle_stripe_webhook,
    get_subscription_details, get_payment_history,
    cancel_subscription, get_user_subscription,
    get_user_payments, get_stripe_webhook_secret, update_environment_variables
)
from backend.server.stripeConfig import (
    ONE_TIME_PRODUCT_ID, ONE_TIME_PRICE_ID,
    SUBSCRIPTION_PRODUCT_ID, SUBSCRIPTION_PRICE_ID
)

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
app = FastAPI()

# Define security object for JWT token handling
security = HTTPBearer()

# Static files and templates
app.mount("/site", StaticFiles(directory="./frontend"), name="site")
app.mount("/static", StaticFiles(directory="./frontend/static"), name="static")
templates = Jinja2Templates(directory="./frontend")

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
        "http://localhost:3000",  # Add this for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
DOC_PATH = os.getenv("DOC_PATH", "./my-docs")

# Load environment variables
load_dotenv()

# Startup event
@app.on_event("startup")
def startup_event():
    os.makedirs("outputs", exist_ok=True)
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
    os.makedirs(DOC_PATH, exist_ok=True)

# Routes
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

@app.get("/files/")
async def list_files():
    files = os.listdir(DOC_PATH)
    print(f"Files in {DOC_PATH}: {files}")
    return {"files": files}

@app.post("/api/multi_agents")
async def run_multi_agents():
    return await execute_multi_agents(manager)

@app.post("/setConfig")
async def set_config(config: ConfigRequest):
    update_environment_variables(config.dict())
    return {"message": "Config updated successfully"}

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    return await handle_file_upload(file, DOC_PATH)

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    return await handle_file_deletion(filename, DOC_PATH)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    if websocket in manager.active_connections:
        try:
            await handle_websocket_communication(websocket, manager)
        except WebSocketDisconnect:
            await manager.disconnect(websocket)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

@app.get("/user/profile")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    user_data = await get_user_data(user_id)
    return user_data

@app.put("/user/profile")
async def update_user_profile(data: dict, current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    await update_user_data(user_id, data)
    return {"message": "Profile updated successfully"}

@app.post("/create-stripe-customer")
async def create_customer(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    email = current_user['email']
    customer_id = await create_stripe_customer(user_id, email)
    return {"customer_id": customer_id}

@app.post("/create-checkout-session")
async def stripe_checkout(request: Request, current_user: dict = Depends(get_current_user)):
    data = await request.json()
    mode = data.get('mode', 'payment')
    success_url = request.url_for('success')
    cancel_url = request.url_for('cancel')
    
    session = await create_checkout_session(mode, success_url, cancel_url)
    return {"id": session.id}

@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    webhook_secret = get_stripe_webhook_secret(request.url.netloc)
    
    event = await handle_stripe_webhook(payload, sig_header, webhook_secret)
    return {"status": "success"}

@app.get("/user/reports")
async def get_user_report_list(limit: int = 10, current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    reports = await get_user_reports(user_id, limit)
    return {"reports": reports}

@app.get("/user/subscription")
async def get_user_subscription_details(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    subscription = await get_subscription_details(user_id)
    return {"subscription": subscription}

@app.get("/user/payment-history")
async def get_user_payment_history(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    history = await get_payment_history(user_id)
    return {"payment_history": history}

@app.post("/user/cancel-subscription")
async def cancel_user_subscription(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    success = await cancel_subscription(user_id)
    return {"success": success}

@app.get("/user-subscription")
async def get_subscription(current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    subscription = await get_user_subscription(user_id)
    return {"subscription": subscription}

@app.get("/user-payments")
async def get_payments(limit: int = 10, current_user: dict = Depends(get_current_user)):
    user_id = current_user['uid']
    payments = await get_user_payments(user_id, limit)
    return {"payments": payments}
