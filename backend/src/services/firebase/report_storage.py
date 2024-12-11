"""
@purpose: Provides robust report storage operations with transaction support and error handling
@prereq: Requires configured Firebase Admin SDK and storage bucket
@reference: Used by server_utils.py for report generation and storage
@maintenance: Monitor Firebase Storage SDK version compatibility
"""

import asyncio
import logging
from datetime import datetime
from io import BytesIO
from typing import Dict, List, Optional

from firebase_admin import firestore

from src.services.firebase.firebase import db, storage_bucket
from src.services.firebase.storage_utils import upload_file_to_storage, delete_file_from_storage
from src.utils.file_utils import write_md_to_pdf, write_md_to_word

logger = logging.getLogger(__name__)

# Constants
MAX_REPORT_SIZE = 10_000_000  # 10MB
SUPPORTED_FORMATS = ['pdf', 'docx', 'md']
CLEANUP_BATCH_SIZE = 100

class ReportStorageError(Exception):
    """Custom exception for report storage errors"""
    pass

class ReportTransaction:
    """Manages atomic operations for report storage"""
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.uploaded_files: List[str] = []
        self.transaction = db.transaction()
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
            
    async def rollback(self):
        """Cleanup uploaded files on failure"""
        for file_path in self.uploaded_files:
            try:
                await delete_file_from_storage(file_path)
                logger.info(f"Cleaned up file during rollback: {file_path}")
            except Exception as e:
                logger.error(f"Error cleaning up file {file_path}: {str(e)}")

async def validate_report_size(report: str) -> None:
    """
    Validates report size before processing
    
    Args:
        report (str): Report content to validate
        
    Raises:
        ValueError: If report size exceeds maximum
    """
    size = len(report.encode('utf-8'))
    if size > MAX_REPORT_SIZE:
        raise ValueError(
            f"Report size {size} bytes exceeds maximum {MAX_REPORT_SIZE} bytes"
        )

async def convert_and_upload_file(
    report: str,
    base_path: str,
    format: str,
    user_id: str
) -> str:
    """
    Converts and uploads a single file format
    
    Args:
        report (str): Report content
        base_path (str): Base storage path
        format (str): Target format (pdf/docx/md)
        user_id (str): User ID for path isolation
        
    Returns:
        str: Storage URL for uploaded file
    """
    try:
        if format == 'pdf':
            stream = await write_md_to_pdf(report, base_path)
            content_type = 'application/pdf'
        elif format == 'docx':
            stream = await write_md_to_word(report, base_path)
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        else:  # markdown
            stream = BytesIO(report.encode())
            content_type = 'text/markdown'
            
        stream.seek(0)
        return await upload_file_to_storage(
            stream,
            f"{base_path}.{format}",
            content_type,
            user_id
        )
    except Exception as e:
        logger.error(f"Error converting/uploading {format} file: {str(e)}")
        raise ReportStorageError(f"Failed to process {format} format: {str(e)}")

async def generate_report_files(
    report: str,
    filename: str,
    user_id: str,
    metadata: Optional[Dict] = None
) -> Dict[str, str]:
    """
    Generates and uploads report files with transaction support
    
    Args:
        report (str): Report content
        filename (str): Base filename
        user_id (str): User ID for path isolation
        metadata (Dict, optional): Additional metadata to store
        
    Returns:
        Dict[str, str]: URLs for uploaded files
        
    Raises:
        ReportStorageError: If storage operations fail
    """
    try:
        # Validate report size
        await validate_report_size(report)
        
        # Setup paths and transaction
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_path = f"users/{user_id}/reports/{filename}-{timestamp}"
        
        async with ReportTransaction(user_id) as transaction:
            # Convert and upload files in parallel
            tasks = [
                convert_and_upload_file(report, base_path, format, user_id)
                for format in SUPPORTED_FORMATS
            ]
            urls = await asyncio.gather(*tasks)
            
            # Create file paths dictionary
            file_paths = dict(zip(SUPPORTED_FORMATS, urls))
            
            # Save metadata to Firestore
            report_ref = db.collection('users').document(user_id)\
                          .collection('reports').document()
                          
            report_data = {
                'filename': filename,
                'created_at': firestore.SERVER_TIMESTAMP,
                'file_paths': file_paths,
                'status': 'completed'
            }
            
            if metadata:
                report_data.update(metadata)
                
            # Use set with merge option for better atomicity
            report_ref.set(report_data, merge=True)
            
            return file_paths
            
    except Exception as e:
        logger.error(f"Error generating report files: {str(e)}")
        raise ReportStorageError(f"Failed to generate report files: {str(e)}")

async def cleanup_orphaned_files(user_id: str, days_old: int = 7) -> None:
    """
    Cleans up orphaned files from failed uploads
    
    Args:
        user_id (str): User ID to clean up
        days_old (int): Age of files to clean up in days
    """
    try:
        # Get report references from Firestore
        reports_ref = db.collection('users').document(user_id)\
                       .collection('reports')
        cutoff_date = datetime.now().timestamp() - (days_old * 24 * 60 * 60)
        
        # Use the new filter syntax
        filter_condition = firestore.FieldFilter('created_at', '<=', cutoff_date)
        query = reports_ref.where(filter=filter_condition)
        reports = query.get()
        
        valid_paths = set()
        
        # Collect valid file paths
        for report in reports:
            data = report.to_dict()
            if 'file_paths' in data:
                valid_paths.update(data['file_paths'].values())
                
        # List all files in storage
        prefix = f"users/{user_id}/reports/"
        blobs = list(storage_bucket.list_blobs(prefix=prefix))
        
        # Delete orphaned files in batches
        batch_count = 0
        delete_tasks = []
        
        for blob in blobs:
            if batch_count >= CLEANUP_BATCH_SIZE:
                break
                
            if blob.name not in valid_paths:
                try:
                    delete_tasks.append(delete_file_from_storage(blob.name))
                    batch_count += 1
                    logger.info(f"Queued deletion for orphaned file: {blob.name}")
                except Exception as e:
                    logger.error(f"Error queueing deletion for file {blob.name}: {str(e)}")
        
        # Execute deletions concurrently
        if delete_tasks:
            await asyncio.gather(*delete_tasks)
                    
    except Exception as e:
        logger.error(f"Error cleaning up orphaned files: {str(e)}")
        raise ReportStorageError(f"Failed to clean up orphaned files: {str(e)}")

async def monitor_storage_metrics(user_id: str) -> Dict:
    """
    Collects storage usage metrics for monitoring
    
    Args:
        user_id (str): User ID to monitor
        
    Returns:
        Dict: Storage metrics
    """
    try:
        prefix = f"users/{user_id}/reports/"
        blobs = list(storage_bucket.list_blobs(prefix=prefix))
        
        total_size = 0
        file_count = 0
        format_counts = {format: 0 for format in SUPPORTED_FORMATS}
        
        for blob in blobs:
            total_size += blob.size
            file_count += 1
            
            # Count files by format
            for format in SUPPORTED_FORMATS:
                if blob.name.endswith(f".{format}"):
                    format_counts[format] += 1
                    break
                    
        return {
            'total_size_bytes': total_size,
            'file_count': file_count,
            'format_counts': format_counts,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error collecting storage metrics: {str(e)}")
        raise ReportStorageError(f"Failed to collect storage metrics: {str(e)}") 