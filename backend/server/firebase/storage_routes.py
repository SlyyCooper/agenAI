"""
@purpose: Provides FastAPI routes for Firebase Storage operations with user-specific isolation
@prereq: Requires configured Firebase Admin SDK and valid authentication
@reference: Used in conjunction with storage_utils.py and firebase.py
@maintenance: Monitor Firebase Storage API version compatibility
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .firebase import verify_firebase_token
from .storage_utils import (
    upload_file_to_storage,
    delete_file_from_storage,
    list_files_in_storage,
    download_file_from_storage,
    get_file_metadata,
    generate_signed_url,
    update_file_metadata,
    copy_file_in_storage
)
import logging

"""
@purpose: Configure route grouping and authentication
@reference: FastAPI routing and security documentation
"""
router = APIRouter(
    prefix="/api/storage",
    tags=["storage"]
)

security = HTTPBearer()
logger = logging.getLogger(__name__)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    @purpose: Validates Firebase JWT and returns decoded user data
    @prereq: Valid Firebase authentication token required
    @limitation: Tokens expire after 1 hour by default
    """
    token = credentials.credentials
    decoded_token = await verify_firebase_token(token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return decoded_token

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Uploads file to user-specific storage location
    @prereq: Authenticated user with valid file data
    @limitation: File size limits based on Firebase Storage quota
    @performance: Upload time scales with file size
    """
    try:
        user_id = current_user['uid']
        filename = f"{user_id}/{file.filename}"
        
        file_url = await upload_file_to_storage(
            file.file,
            filename,
            file.content_type
        )
        
        return {"message": "File uploaded successfully", "url": file_url}
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete/{filename}")
async def delete_file(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Deletes user file with path isolation
    @prereq: File must exist in user's storage space
    @invariant: Users can only delete their own files
    """
    try:
        user_id = current_user['uid']
        full_path = f"{user_id}/{filename}"
        
        await delete_file_from_storage(full_path)
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_files(
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Lists files in user's storage space
    @performance: O(n) where n is number of files
    @limitation: Returns up to 1000 files per request
    """
    try:
        user_id = current_user['uid']
        files = await list_files_in_storage(prefix=user_id)
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{filename}")
async def download_file(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Downloads file with user isolation
    @prereq: File must exist in user's storage space
    @performance: Download time scales with file size
    """
    try:
        user_id = current_user['uid']
        full_path = f"{user_id}/{filename}"
        
        content = await download_file_from_storage(full_path)
        return content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metadata/{filename}")
async def get_metadata(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Retrieves file metadata with user isolation
    @reference: Firebase Storage metadata documentation
    @example: Returns size, content type, creation time
    """
    try:
        user_id = current_user['uid']
        full_path = f"{user_id}/{filename}"
        
        metadata = await get_file_metadata(full_path)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/signed-url/{filename}")
async def get_signed_url(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Generates temporary access URL for file
    @limitation: URL expires after configured duration
    @security: URL grants read-only access to single file
    """
    try:
        user_id = current_user['uid']
        full_path = f"{user_id}/{filename}"
        
        url = await generate_signed_url(full_path)
        return {"signed_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/metadata/{filename}")
async def update_metadata(
    filename: str,
    metadata: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Updates file metadata with user isolation
    @prereq: File must exist in user's storage space
    @limitation: Cannot modify system metadata fields
    """
    try:
        user_id = current_user['uid']
        full_path = f"{user_id}/{filename}"
        
        await update_file_metadata(full_path, metadata)
        return {"message": "Metadata updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/copy")
async def copy_file(
    source_filename: str,
    destination_filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    @purpose: Copies file within user's storage space
    @prereq: Source file must exist in user's storage
    @performance: O(1) for same-bucket copies
    @limitation: Cross-bucket copies not supported
    """
    try:
        user_id = current_user['uid']
        source_path = f"{user_id}/{source_filename}"
        destination_path = f"{user_id}/{destination_filename}"
        
        await copy_file_in_storage(source_path, destination_path)
        return {"message": "File copied successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
