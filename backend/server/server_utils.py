import json
import os
import re
import time
import shutil
from typing import Dict, List
from fastapi.responses import JSONResponse
from gpt_researcher.document.document import DocumentLoader
# Add this import
from backend.utils import write_md_to_pdf, write_md_to_word, write_text_to_md
from gpt_researcher.orchestrator.actions.utils import stream_output
from multi_agents.main import run_research_task
import firebase_admin
from firebase_admin import credentials, auth, firestore
from dotenv import load_dotenv
from urllib.parse import urlparse
import stripe  # Add this import


def sanitize_filename(filename: str) -> str:
    return re.sub(r"[^\w\s-]", "", filename).strip()


async def handle_start_command(websocket, data: str, manager):
    json_data = json.loads(data[6:])
    task, report_type, source_urls, tone, headers, report_source = extract_command_data(
        json_data)

    if not task or not report_type:
        print("Error: Missing task or report_type")
        return

    sanitized_filename = sanitize_filename(f"task_{int(time.time())}_{task}")

    report = await manager.start_streaming(
        task, report_type, report_source, source_urls, tone, websocket, headers
    )
    report = str(report)
    file_paths = await generate_report_files(report, sanitized_filename)
    await send_file_paths(websocket, file_paths)


async def handle_human_feedback(data: str):
    feedback_data = json.loads(data[14:])  # Remove "human_feedback" prefix
    print(f"Received human feedback: {feedback_data}")
    # TODO: Add logic to forward the feedback to the appropriate agent or update the research state


async def generate_report_files(report: str, filename: str) -> Dict[str, str]:
    pdf_path = await write_md_to_pdf(report, filename)
    docx_path = await write_md_to_word(report, filename)
    md_path = await write_text_to_md(report, filename)
    return {"pdf": pdf_path, "docx": docx_path, "md": md_path}


async def send_file_paths(websocket, file_paths: Dict[str, str]):
    await websocket.send_json({"type": "path", "output": file_paths})


def get_config_dict(
    langchain_api_key: str, openai_api_key: str, tavily_api_key: str,
    google_api_key: str, google_cx_key: str, bing_api_key: str,
    searchapi_api_key: str, serpapi_api_key: str, serper_api_key: str, searx_url: str
) -> Dict[str, str]:
    return {
        "LANGCHAIN_API_KEY": langchain_api_key or os.getenv("LANGCHAIN_API_KEY", ""),
        "OPENAI_API_KEY": openai_api_key or os.getenv("OPENAI_API_KEY", ""),
        "TAVILY_API_KEY": tavily_api_key or os.getenv("TAVILY_API_KEY", ""),
        "GOOGLE_API_KEY": google_api_key or os.getenv("GOOGLE_API_KEY", ""),
        "GOOGLE_CX_KEY": google_cx_key or os.getenv("GOOGLE_CX_KEY", ""),
        "BING_API_KEY": bing_api_key or os.getenv("BING_API_KEY", ""),
        "SEARCHAPI_API_KEY": searchapi_api_key or os.getenv("SEARCHAPI_API_KEY", ""),
        "SERPAPI_API_KEY": serpapi_api_key or os.getenv("SERPAPI_API_KEY", ""),
        "SERPER_API_KEY": serper_api_key or os.getenv("SERPER_API_KEY", ""),
        "SEARX_URL": searx_url or os.getenv("SEARX_URL", ""),
        "LANGCHAIN_TRACING_V2": os.getenv("LANGCHAIN_TRACING_V2", "true"),
        "DOC_PATH": os.getenv("DOC_PATH", "./my-docs"),
        "RETRIEVER": os.getenv("RETRIEVER", ""),
        "EMBEDDING_MODEL": os.getenv("OPENAI_EMBEDDING_MODEL", ""),
        "STRIPE_SECRET_KEY": os.getenv("STRIPE_SECRET_KEY", ""),
        "STRIPE_WEBHOOK_SECRET_WWW_AGENAI": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_AGENAI", ""),
        "STRIPE_WEBHOOK_SECRET_AGENAI": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI", ""),
        "STRIPE_WEBHOOK_SECRET_TANALYZE": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE", ""),
        "STRIPE_WEBHOOK_SECRET_WWW_TANALYZE": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_TANALYZE", ""),
    }


def update_environment_variables(config: Dict[str, str]):
    for key, value in config.items():
        os.environ[key] = value
    
    # Initialize Stripe after updating environment variables
    initialize_stripe()


async def handle_file_upload(file, DOC_PATH: str) -> Dict[str, str]:
    file_path = os.path.join(DOC_PATH, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"File uploaded to {file_path}")

    document_loader = DocumentLoader(DOC_PATH)
    await document_loader.load()

    return {"filename": file.filename, "path": file_path}


async def handle_file_deletion(filename: str, DOC_PATH: str) -> JSONResponse:
    file_path = os.path.join(DOC_PATH, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"File deleted: {file_path}")
        return JSONResponse(content={"message": "File deleted successfully"})
    else:
        print(f"File not found: {file_path}")
        return JSONResponse(status_code=404, content={"message": "File not found"})


async def execute_multi_agents(manager) -> Dict[str, str]:
    websocket = manager.active_connections[0] if manager.active_connections else None
    if websocket:
        report = await run_research_task("Is AI in a hype cycle?", websocket, stream_output)
        return {"report": report}
    else:
        return JSONResponse(status_code=400, content={"message": "No active WebSocket connection"})


async def handle_websocket_communication(websocket, manager):
    try:
        # Remove the authentication logic here
        while True:
            data = await websocket.receive_text()
            if data.startswith("start"):
                await handle_start_command(websocket, data, manager)
            elif data.startswith("human_feedback"):
                await handle_human_feedback(data)
            else:
                print("Error: Unknown command or not enough parameters provided.")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket)


async def create_user_profile(user_id: str, email: str, name: str = None):
    """Create a new user profile in Firestore."""
    user_ref = db.collection('users').document(user_id)
    user_data = {
        'email': email,
        'created_at': firestore.SERVER_TIMESTAMP,
        'last_login': firestore.SERVER_TIMESTAMP
    }
    if name:
        user_data['name'] = name
    user_ref.set(user_data)


async def update_user_data(user_id: str, data: dict):
    """Update user data in Firestore."""
    user_ref = db.collection('users').document(user_id)
    user_ref.update(data)


async def get_user_data(user_id: str):
    """Retrieve user data from Firestore."""
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    return doc.to_dict() if doc.exists else None


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


def extract_command_data(json_data: Dict) -> tuple:
    return (
        json_data.get("task"),
        json_data.get("report_type"),
        json_data.get("source_urls"),
        json_data.get("tone"),
        json_data.get("headers", {}),
        json_data.get("report_source")
    )

def get_stripe_webhook_secret(request_url: str) -> str:
    parsed_url = urlparse(request_url)
    domain = parsed_url.netloc

    webhook_secrets = {
        "www.agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_AGENAI"),
        "agenai.app": os.getenv("STRIPE_WEBHOOK_SECRET_AGENAI"),
        "tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_TANALYZE"),
        "www.tanalyze.app": os.getenv("STRIPE_WEBHOOK_SECRET_WWW_TANALYZE"),
    }

    return webhook_secrets.get(domain, "")

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

# Add this function to initialize Stripe
def initialize_stripe():
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
