"""
@purpose: Provides Firebase Storage operations with enhanced error handling and monitoring
@prereq: Requires configured Firebase Admin SDK and storage bucket
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, BinaryIO, Union, Dict, Any, List
from io import BytesIO
from functools import wraps

from prometheus_client import Counter, Histogram

from src.services.firebase.firebase import storage_bucket, db

# Metrics
storage_operations = Counter('storage_operations_total', 'Total storage operations', ['operation', 'status'])
storage_latency = Histogram('storage_operation_latency_seconds', 'Storage operation latency', ['operation'])
storage_errors = Counter('storage_errors_total', 'Total storage errors', ['operation', 'error_type'])

logger = logging.getLogger(__name__)

def monitor_storage_operation(operation_name: str):
    """Decorator for monitoring storage operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = datetime.now()
            try:
                result = await func(*args, **kwargs)
                storage_operations.labels(operation=operation_name, status='success').inc()
                return result
            except Exception as e:
                storage_operations.labels(operation=operation_name, status='error').inc()
                storage_errors.labels(operation=operation_name, error_type=type(e).__name__).inc()
                raise
            finally:
                duration = (datetime.now() - start_time).total_seconds()
                storage_latency.labels(operation=operation_name).observe(duration)
        return wrapper
    return decorator

class StorageQuotaExceeded(Exception):
    """Raised when user storage quota is exceeded"""
    pass

class InvalidStorageOperation(Exception):
    """Raised when storage operation is invalid"""
    pass

@monitor_storage_operation('upload_file')
async def upload_file_to_storage(
    file_stream: Union[BinaryIO, BytesIO],
    filename: str,
    content_type: str,
    user_id: Optional[str] = None,
    make_public: bool = False,
    metadata: Optional[Dict[str, Any]] = None
) -> str:
    """Enhanced file upload with quota checking and metadata"""
    try:
        if user_id:
            # Check user quota
            quota = await get_user_storage_quota(user_id)
            if quota['exceeded']:
                raise StorageQuotaExceeded(f"Storage quota exceeded for user {user_id}")

        full_path = f"users/{user_id}/reports/{filename}" if user_id else filename
        
        # Validate path
        if not is_valid_storage_path(full_path):
            raise InvalidStorageOperation(f"Invalid storage path: {full_path}")

        blob = storage_bucket.blob(full_path)
        
        # Set metadata if provided
        if metadata:
            blob.metadata = {
                **metadata,
                'uploaded_at': datetime.now().isoformat(),
                'content_type': content_type
            }
        
        blob.upload_from_file(file_stream, content_type=content_type)
        
        if make_public:
            blob.make_public()
            return blob.public_url
        else:
            return await generate_signed_url(full_path)
            
    except Exception as e:
        logger.error(f"Error uploading file to Firebase Storage: {str(e)}")
        raise

@monitor_storage_operation('get_user_quota')
async def get_user_storage_quota(user_id: str) -> Dict[str, Any]:
    """Get user's storage quota and usage"""
    try:
        quota_doc = await db.collection('users').document(user_id).get()
        quota_data = quota_doc.to_dict().get('storage_quota', {})
        
        current_usage = await calculate_user_storage_usage(user_id)
        max_storage = quota_data.get('max_storage', 100 * 1024 * 1024)  # 100MB default
        
        return {
            'used': current_usage,
            'total': max_storage,
            'exceeded': current_usage >= max_storage
        }
    except Exception as e:
        logger.error(f"Error getting user storage quota: {str(e)}")
        raise

@monitor_storage_operation('calculate_usage')
async def calculate_user_storage_usage(user_id: str) -> int:
    """Calculate total storage usage for a user"""
    try:
        prefix = f"users/{user_id}/"
        total_size = 0
        
        blobs = storage_bucket.list_blobs(prefix=prefix)
        for blob in blobs:
            total_size += blob.size
            
        return total_size
    except Exception as e:
        logger.error(f"Error calculating user storage usage: {str(e)}")
        raise

def is_valid_storage_path(path: str) -> bool:
    """Validate storage path structure and components"""
    if not path or '..' in path:
        return False
        
    parts = path.split('/')
    if len(parts) < 3:
        return False
        
    valid_prefixes = {'users', 'public', 'temp'}
    return parts[0] in valid_prefixes

@monitor_storage_operation('cleanup')
async def cleanup_expired_files(days: int = 7) -> List[str]:
    """Clean up expired temporary files"""
    try:
        cutoff = datetime.now() - timedelta(days=days)
        deleted_files = []
        
        blobs = storage_bucket.list_blobs(prefix='temp/')
        for blob in blobs:
            if blob.time_created < cutoff:
                blob.delete()
                deleted_files.append(blob.name)
                
        return deleted_files
    except Exception as e:
        logger.error(f"Error cleaning up expired files: {str(e)}")
        raise

async def list_user_reports(user_id: str) -> list:
    """
    @purpose: Retrieves metadata for all user report files
    @prereq: Valid user_id required
    @performance: O(n) where n is number of user files
    @example: reports = await list_user_reports('user123')
    """
    try:
        prefix = f"users/{user_id}/reports/"
        blobs = storage_bucket.list_blobs(prefix=prefix)
        return [{
            'name': blob.name.replace(prefix, ''),  # @purpose: Clean names for display
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
    @purpose: Removes specific user report with path validation
    @prereq: Valid user_id and filename required
    @invariant: Only deletes files in user's directory
    @performance: Single Storage delete operation
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
    @purpose: Deletes arbitrary file from Storage
    @prereq: Valid filename and delete permissions
    @limitation: No path validation - use with caution
    @performance: Single Storage delete operation
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
    @purpose: Lists all files, optionally filtered by prefix
    @prereq: List permissions on bucket
    @performance: O(n) where n is total files in bucket/prefix
    @limitation: May be slow for large buckets
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
    @purpose: Downloads file content as bytes
    @prereq: Valid filename and read permissions
    @performance: O(file_size) download time
    @limitation: Memory limited by file size
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
    @purpose: Retrieves comprehensive file metadata
    @prereq: Valid filename and metadata read permissions
    @performance: Single Storage metadata operation
    @example: metadata = await get_file_metadata('users/123/report.pdf')
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
    @purpose: Updates custom metadata on existing file
    @prereq: Valid filename and metadata write permissions
    @invariant: Does not modify file content
    @performance: Single Storage patch operation
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
    @purpose: Creates file copy within Storage bucket
    @prereq: Read access to source, write access to destination
    @performance: O(1) for same-bucket copies
    @limitation: Same bucket copies only
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
    @purpose: Creates time-limited access URL for private files
    @prereq: Valid filename and URL signing permissions
    @performance: Single URL generation operation
    @limitation: Maximum expiration time limited by Storage settings
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

async def save_research_report(
    file_stream: Union[BinaryIO, BytesIO],
    metadata: Dict[str, Any],
    content: str,
) -> Dict[str, Any]:
    """
    @purpose: Saves research report to Firebase Storage and creates Firestore document
    @prereq: Valid file stream, metadata, and content required
    @invariant: Reports are saved in user-specific paths with metadata in Firestore
    """
    try:
        user_id = metadata.get('userId')
        if not user_id:
            raise ValueError("User ID is required")

        # Save file to Storage
        timestamp = datetime.now().isoformat()
        filename = f"research-{timestamp}.md"
        file_path = f"users/{user_id}/research/{filename}"
        
        blob = storage_bucket.blob(file_path)
        blob.upload_from_file(file_stream, content_type='text/markdown')
        
        # Generate signed URL
        url = await generate_signed_url(file_path)
        
        # Create Firestore document
        doc_ref = db.collection('users').document(user_id).collection('research').document()
        doc_data = {
            'title': metadata.get('title', 'Untitled Research'),
            'content': content,
            'file_path': file_path,
            'url': url,
            'created_at': timestamp,
            'updated_at': timestamp,
            'type': 'research_report'
        }
        await doc_ref.set(doc_data)
        
        return {
            'id': doc_ref.id,
            'url': url,
            'metadata': {
                'path': file_path,
                'created': timestamp,
                'updated': timestamp,
                'title': metadata.get('title')
            }
        }
        
    except Exception as e:
        logger.error(f"Error saving research report: {str(e)}")
        raise 
