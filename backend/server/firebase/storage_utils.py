"""
@purpose: Provides Firebase Storage operations for file management with user isolation
@prereq: Requires configured Firebase Admin SDK and storage bucket
@reference: Used with stripe_routes.py for file handling
@maintenance: Monitor Firebase Storage SDK version compatibility
"""

import os
import logging
from .firebase import storage_bucket
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
    @purpose: Uploads file to Firebase Storage with user isolation and access control
    @prereq: Valid file stream and content type required
    @invariant: User files are isolated in user-specific paths
    @performance: O(file_size) upload time, single Storage operation
    @example:
        url = await upload_file_to_storage(
            file_stream=open('report.pdf', 'rb'),
            filename='report.pdf',
            content_type='application/pdf',
            user_id='user123',
            make_public=False
        )
    """
    try:
        # @purpose: Enforce user isolation through path structure
        full_path = f"users/{user_id}/reports/{filename}" if user_id else filename
        
        blob = storage_bucket.blob(full_path)
        blob.upload_from_file(file_stream, content_type=content_type)
        
        if make_public:
            blob.make_public()
            return blob.public_url
        else:
            # @purpose: Time-limited access for private files
            return await generate_signed_url(full_path)
            
    except Exception as e:
        logger.error(f"Error uploading file to Firebase Storage: {str(e)}")
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
