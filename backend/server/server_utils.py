import json
import os
import re
import time
from datetime import datetime
from io import BytesIO
from typing import Dict, List
from fastapi.responses import JSONResponse
from gpt_researcher.document.document import DocumentLoader
from backend.utils import write_md_to_pdf, write_md_to_word
from gpt_researcher.orchestrator.actions.utils import stream_output
from multi_agents.main import run_research_task
from backend.server.firebase.firebase import db
from backend.server.firebase.storage_utils import (
    upload_file_to_storage,
    delete_file_from_storage,
    list_files_in_storage,
    generate_signed_url
)
from firebase_admin import auth, firestore
from dotenv import load_dotenv
from urllib.parse import urlparse

def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to be safe for all operating systems.
    
    Args:
        filename (str): The filename to sanitize
        
    Returns:
        str: A sanitized filename safe for all operating systems
    """
    # Replace invalid characters with underscores
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
    task, report_type, source_urls, tone, headers, report_source = extract_command_data(json_data)
    
    user_id = getattr(websocket, 'user_id', None)
    if not user_id:
        await websocket.send_json({"type": "error", "output": "No user ID found"})
        return

    report_data = await manager.start_streaming(
        task, report_type, report_source, source_urls, tone, websocket, headers
    )
    
    # Generate files with user-specific paths
    sanitized_filename = sanitize_filename(task)
    file_paths = await generate_report_files(
        report_data["report"], 
        sanitized_filename,
        user_id
    )
    
    # Store report metadata in Firestore
    report_ref = db.collection('users').document(user_id).collection('reports').document()
    await report_ref.set({
        'task': task,
        'report_type': report_type,
        'created_at': firestore.SERVER_TIMESTAMP,
        'file_paths': file_paths,
        'status': 'completed'
    })

    await send_file_paths(websocket, file_paths)

async def handle_human_feedback(data: str):
    feedback_data = json.loads(data[14:])  # Remove "human_feedback" prefix
    print(f"Received human feedback: {feedback_data}")

async def generate_report_files(report: str, filename: str, user_id: str) -> Dict[str, str]:
    """Generate and upload report files to Firebase Storage."""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_path = f"users/{user_id}/reports/{filename}-{timestamp}"
        
        # Generate PDF
        pdf_stream = await write_md_to_pdf(report, filename)
        pdf_stream.seek(0)  # Reset stream position
        pdf_url = await upload_file_to_storage(
            pdf_stream,
            f"{base_path}.pdf",
            'application/pdf',
            user_id
        )
        
        # Generate DOCX
        docx_stream = await write_md_to_word(report, filename)
        docx_stream.seek(0)  # Reset stream position
        docx_url = await upload_file_to_storage(
            docx_stream,
            f"{base_path}.docx",
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            user_id
        )
        
        # Generate MD
        md_stream = BytesIO(report.encode())
        md_url = await upload_file_to_storage(
            md_stream,
            f"{base_path}.md",
            'text/markdown',
            user_id
        )
        
        return {
            "pdf": pdf_url,
            "docx": docx_url,
            "md": md_url
        }
    except Exception as e:
        print(f"Error generating report files: {str(e)}")
        raise

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
        "LANGCHAIN_TRACING_V2": os.getenv("LANGCHAIN_TRACING_V2", "true"),
        "DOC_PATH": os.getenv("DOC_PATH", "./my-docs"),
        "RETRIEVER": os.getenv("RETRIEVER", ""),
        "EMBEDDING_MODEL": os.getenv("OPENAI_EMBEDDING_MODEL", ""),
    }

def update_environment_variables(config: Dict[str, str]):
    for key, value in config.items():
        os.environ[key] = value

async def handle_file_upload(file, user_id: str) -> Dict[str, str]:
    """Upload file to Firebase Storage only."""
    try:
        # Upload to Firebase Storage
        firebase_url = await upload_file_to_storage(
            file.file,
            file.filename,
            file.content_type,
            user_id
        )
        print(f"File uploaded to Firebase Storage: {firebase_url}")

        return {
            "filename": file.filename,
            "firebase_url": firebase_url
        }
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise

async def handle_file_deletion(filename: str, user_id: str) -> JSONResponse:
    """Delete file from Firebase Storage."""
    try:
        # Delete from Firebase Storage
        await delete_file_from_storage(f"users/{user_id}/files/{filename}")
        print(f"File deleted from Firebase Storage: {filename}")

        return JSONResponse(content={"message": "File deleted successfully from Firebase Storage"})
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
