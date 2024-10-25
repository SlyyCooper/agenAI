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
from backend.server.firebase.firebase_init import db
from firebase_admin import auth, firestore
from dotenv import load_dotenv
from urllib.parse import urlparse
from backend.server.firebase.storage.storage_utils import (
    upload_file_to_storage,
    delete_file_from_storage,
    list_files_in_storage
)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to be safe for all operating systems.
    
    Args:
        filename (str): The filename to sanitize
        
    Returns:
        str: A sanitized filename safe for all operating systems
    """
    # Replace invalid characters with underscores
    # This covers Windows reserved characters and general filesystem safety
    invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
    sanitized = re.sub(invalid_chars, '_', filename)
    
    # Remove leading/trailing spaces and dots
    sanitized = sanitized.strip('. ')
    
    # Ensure the filename isn't empty after sanitization
    if not sanitized:
        sanitized = 'unnamed_file'
        
    return sanitized


async def handle_start_command(websocket, data: str, manager):
    json_data = json.loads(data[6:])
    task, report_type, source_urls, tone, headers, report_source = extract_command_data(
        json_data)

    if not task or not report_type:
        print("Error: Missing task or report_type")
        return

    sanitized_filename = sanitize_filename(task)
    user_id = getattr(websocket, 'user_id', None)
    
    if not user_id:
        print("Error: No user ID found")
        return

    # Prefix filename with user_id
    user_filename = f"{user_id}/{sanitized_filename}"

    report = await manager.start_streaming(
        task, report_type, report_source, source_urls, tone, websocket, headers
    )
    report = str(report)
    file_paths = await generate_report_files(report, user_filename)
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
    }


def update_environment_variables(config: Dict[str, str]):
    for key, value in config.items():
        os.environ[key] = value
    

async def handle_file_upload(file, DOC_PATH: str) -> Dict[str, str]:
    try:
        # Local file handling
        file_path = os.path.join(DOC_PATH, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"File uploaded to local path: {file_path}")

        # Upload to Firebase Storage
        file.file.seek(0)  # Reset file pointer
        firebase_url = await upload_file_to_storage(
            file.file,
            file.filename,
            file.content_type
        )
        print(f"File uploaded to Firebase Storage: {firebase_url}")

        document_loader = DocumentLoader(DOC_PATH)
        await document_loader.load()

        return {
            "filename": file.filename,
            "local_path": file_path,
            "firebase_url": firebase_url
        }
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise


async def handle_file_deletion(filename: str, DOC_PATH: str) -> JSONResponse:
    try:
        # Delete from local storage
        file_path = os.path.join(DOC_PATH, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"File deleted from local storage: {file_path}")

        # Delete from Firebase Storage
        await delete_file_from_storage(filename)
        print(f"File deleted from Firebase Storage: {filename}")

        return JSONResponse(content={"message": "File deleted successfully from both storages"})
    except Exception as e:
        print(f"Error deleting file: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": f"Error deleting file: {str(e)}"}
        )


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

def extract_command_data(json_data: Dict) -> tuple:
    return (
        json_data.get("task"),
        json_data.get("report_type"),
        json_data.get("source_urls"),
        json_data.get("tone"),
        json_data.get("headers", {}),
        json_data.get("report_source")
    )

# Load environment variables
load_dotenv()
