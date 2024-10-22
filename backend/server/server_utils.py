import json
import os
import re
import time
import shutil
from typing import Dict, List
from fastapi.responses import JSONResponse
from gpt_researcher.document.document import DocumentLoader
from backend.utils import write_md_to_pdf, write_md_to_word, write_text_to_md
from gpt_researcher.orchestrator.actions.utils import stream_output
from multi_agents.main import run_research_task
from dotenv import load_dotenv
from backend.server.firebase_utils import save_report_to_firestore, increment_user_field

# Load environment variables
load_dotenv()

# Function to sanitize filenames
def sanitize_filename(filename: str) -> str:
    return re.sub(r"[^\w\s-]", "", filename).strip()

# Handle the start command for research tasks
async def handle_start_command(websocket, data: str, manager):
    json_data = json.loads(data[6:])
    task, report_type, source_urls, tone, headers, report_source = extract_command_data(json_data)

    if not task or not report_type:
        print("Error: Missing task or report_type")
        return

    sanitized_filename = sanitize_filename(f"task_{int(time.time())}_{task}")

    # Start the research task and generate the report
    report = await manager.start_streaming(
        task, report_type, report_source, source_urls, tone, websocket, headers
    )
    report = str(report)
    file_paths = await generate_report_files(report, sanitized_filename)
    
    # Save the report to Firestore and update user data
    user_id = websocket.scope.get('user_id')  # Assuming you've set this when authenticating the WebSocket
    if user_id:
        report_id = await save_report_to_firestore(user_id, report, report_type, task)
        if report_id:
            file_paths['report_id'] = report_id
        
        # Increment the reports_generated field
        await increment_user_field(user_id, 'reports_generated')

    await send_file_paths(websocket, file_paths)

# Handle human feedback (placeholder for future implementation)
async def handle_human_feedback(data: str):
    feedback_data = json.loads(data[14:])  # Remove "human_feedback" prefix
    print(f"Received human feedback: {feedback_data}")
    # TODO: Add logic to forward the feedback to the appropriate agent or update the research state

# Generate report files in different formats
async def generate_report_files(report: str, filename: str) -> Dict[str, str]:
    pdf_path = await write_md_to_pdf(report, filename)
    docx_path = await write_md_to_word(report, filename)
    md_path = await write_text_to_md(report, filename)
    return {"pdf": pdf_path, "docx": docx_path, "md": md_path}

# Send file paths to the client
async def send_file_paths(websocket, file_paths: Dict[str, str]):
    await websocket.send_json({"type": "path", "output": file_paths})

# Get configuration dictionary
def get_config_dict(
    langchain_api_key: str, openai_api_key: str, tavily_api_key: str,
    google_api_key: str, google_cx_key: str, bing_api_key: str,
    searchapi_api_key: str, serpapi_api_key: str, serper_api_key: str, searx_url: str
) -> Dict[str, str]:
    # Return a dictionary of configuration values, using environment variables as fallbacks
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

# Handle file upload
async def handle_file_upload(file, DOC_PATH: str) -> Dict[str, str]:
    file_path = os.path.join(DOC_PATH, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    print(f"File uploaded to {file_path}")

    document_loader = DocumentLoader(DOC_PATH)
    await document_loader.load()

    return {"filename": file.filename, "path": file_path}

# Handle file deletion
async def handle_file_deletion(filename: str, DOC_PATH: str) -> JSONResponse:
    file_path = os.path.join(DOC_PATH, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        print(f"File deleted: {file_path}")
        return JSONResponse(content={"message": "File deleted successfully"})
    else:
        print(f"File not found: {file_path}")
        return JSONResponse(status_code=404, content={"message": "File not found"})

# Execute multi-agent research task
async def execute_multi_agents(manager) -> Dict[str, str]:
    websocket = manager.active_connections[0] if manager.active_connections else None
    if websocket:
        report = await run_research_task("Is AI in a hype cycle?", websocket, stream_output)
        return {"report": report}
    else:
        return JSONResponse(status_code=400, content={"message": "No active WebSocket connection"})

# Handle WebSocket communication
async def handle_websocket_communication(websocket, manager):
    try:
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

# Extract command data from JSON
def extract_command_data(json_data: Dict) -> tuple:
    return (
        json_data.get("task"),
        json_data.get("report_type"),
        json_data.get("source_urls"),
        json_data.get("tone"),
        json_data.get("headers", {}),
        json_data.get("report_source")
    )
