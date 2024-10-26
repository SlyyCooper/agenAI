import os
import logging
from backend.server.firebase.storage.storage_init import storage_bucket
from typing import Optional, BinaryIO, Union
from io import BytesIO

logger = logging.getLogger(__name__)

async def upload_file_to_storage(
    file_stream: Union[BinaryIO, BytesIO],
    filename: str,
    content_type: str,
    user_id: Optional[str] = None,
    make_public: bool = False
) -> str:
    """
    Uploads a file to Firebase Storage with user-specific paths.
    
    Args:
        file_stream: The file content to upload
        filename: Name of the file
        content_type: MIME type of the file
        user_id: Optional user ID for organizing files
        make_public: Whether to make the file publicly accessible
    
    Returns:
        str: The URL of the uploaded file
    """
    try:
        # Create user-specific path if user_id is provided
        full_path = f"users/{user_id}/reports/{filename}" if user_id else filename
        
        blob = storage_bucket.blob(full_path)
        blob.upload_from_file(file_stream, content_type=content_type)
        
        if make_public:
            blob.make_public()
            return blob.public_url
        else:
            # Generate a signed URL with 1 hour expiration for private files
            return await generate_signed_url(full_path)
            
    except Exception as e:
        logger.error(f"Error uploading file to Firebase Storage: {str(e)}")
        raise

async def list_user_reports(user_id: str) -> list:
    """
    Lists all report files for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        list: List of report files
    """
    try:
        prefix = f"users/{user_id}/reports/"
        blobs = storage_bucket.list_blobs(prefix=prefix)
        return [{
            'name': blob.name.replace(prefix, ''),  # Remove prefix for cleaner names
            'full_path': blob.name,
            'created_at': blob.time_created,
            'size': blob.size,
            'content_type': blob.content_type
        } for blob in blobs]
    except Exception as e:
        logger.error(f"Error listing user reports: {str(e)}")
        raise

async def delete_user_report(user_id: str, filename: str):
    """
    Deletes a specific report file for a user.
    
    Args:
        user_id: The user's ID
        filename: Name of the file to delete
    """
    try:
        full_path = f"users/{user_id}/reports/{filename}"
        blob = storage_bucket.blob(full_path)
        blob.delete()
        logger.info(f"Deleted report {filename} for user {user_id}")
    except Exception as e:
        logger.error(f"Error deleting user report: {str(e)}")
        raise

async def delete_file_from_storage(filename):
    """
    Deletes a file from Firebase Storage.
    """
    try:
        blob = storage_bucket.blob(filename)
        blob.delete()
        logger.info(f"File {filename} deleted from Firebase Storage.")
    except Exception as e:
        logger.error(f"Error deleting file from Firebase Storage: {str(e)}")
        raise

async def list_files_in_storage(prefix=None):
    """
    Lists all files in the Firebase Storage bucket.
    Optionally filter by a prefix (e.g., user ID).
    """
    try:
        blobs = storage_bucket.list_blobs(prefix=prefix)
        file_list = [blob.name for blob in blobs]
        return file_list
    except Exception as e:
        logger.error(f"Error listing files in Firebase Storage: {str(e)}")
        raise

async def download_file_from_storage(filename):
    """
    Downloads a file from Firebase Storage.
    """
    try:
        blob = storage_bucket.blob(filename)
        content = blob.download_as_bytes()
        return content
    except Exception as e:
        logger.error(f"Error downloading file from Firebase Storage: {str(e)}")
        raise

async def get_file_metadata(filename):
    """
    Gets metadata for a file in Firebase Storage.
    """
    try:
        blob = storage_bucket.blob(filename)
        return {
            'name': blob.name,
            'size': blob.size,
            'content_type': blob.content_type,
            'created': blob.time_created,
            'updated': blob.updated,
            'public_url': blob.public_url if blob.public else None
        }
    except Exception as e:
        logger.error(f"Error getting file metadata from Firebase Storage: {str(e)}")
        raise

async def update_file_metadata(filename, metadata):
    """
    Updates metadata for a file in Firebase Storage.
    """
    try:
        blob = storage_bucket.blob(filename)
        blob.metadata = metadata
        blob.patch()
        logger.info(f"Metadata updated for file {filename}")
    except Exception as e:
        logger.error(f"Error updating file metadata in Firebase Storage: {str(e)}")
        raise

async def copy_file_in_storage(source_filename, destination_filename):
    """
    Copies a file within Firebase Storage.
    """
    try:
        source_blob = storage_bucket.blob(source_filename)
        destination_blob = storage_bucket.blob(destination_filename)
        
        storage_bucket.copy_blob(source_blob, storage_bucket, destination_blob)
        logger.info(f"File copied from {source_filename} to {destination_filename}")
    except Exception as e:
        logger.error(f"Error copying file in Firebase Storage: {str(e)}")
        raise

async def generate_signed_url(filename, expiration=3600):
    """
    Generates a signed URL for temporary access to a file.
    Default expiration is 1 hour (3600 seconds).
    """
    try:
        blob = storage_bucket.blob(filename)
        url = blob.generate_signed_url(
            expiration=expiration,
            method='GET'
        )
        return url
    except Exception as e:
        logger.error(f"Error generating signed URL: {str(e)}")
        raise
