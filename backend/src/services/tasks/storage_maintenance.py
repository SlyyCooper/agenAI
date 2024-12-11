"""
@purpose: Enhanced storage maintenance with monitoring and automated cleanup
@prereq: Requires configured Firebase Admin SDK and storage bucket
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from firebase_admin import firestore
from ..firebase.firebase import db, storage_bucket
from ..firebase.storage_utils import (
    cleanup_expired_files,
    calculate_user_storage_usage,
    get_user_storage_quota,
    StorageQuotaExceeded
)
from prometheus_client import Gauge, Counter, Histogram

logger = logging.getLogger(__name__)

# Prometheus metrics
storage_usage = Gauge('storage_usage_bytes', 'Current storage usage in bytes', ['user_id'])
storage_quota = Gauge('storage_quota_bytes', 'Storage quota in bytes', ['user_id'])
maintenance_duration = Histogram('storage_maintenance_duration_seconds', 'Duration of maintenance tasks')
cleanup_files = Counter('storage_cleanup_files_total', 'Number of files cleaned up')
maintenance_errors = Counter('storage_maintenance_errors_total', 'Number of maintenance errors', ['task'])

class MaintenanceTask:
    def __init__(self, name: str):
        self.name = name
        self.last_run = None
        self.is_running = False
        self.error_count = 0

    async def execute(self, func, *args, **kwargs):
        if self.is_running:
            logger.warning(f"Task {self.name} is already running")
            return

        self.is_running = True
        start_time = datetime.now()

        try:
            result = await func(*args, **kwargs)
            self.last_run = datetime.now()
            maintenance_duration.observe((datetime.now() - start_time).total_seconds())
            return result
        except Exception as e:
            self.error_count += 1
            maintenance_errors.labels(task=self.name).inc()
            logger.error(f"Error in maintenance task {self.name}: {str(e)}")
            raise
        finally:
            self.is_running = False

async def get_active_users(days: int = 30) -> List[str]:
    """Get list of users who have been active in the last N days"""
    try:
        cutoff = datetime.now() - timedelta(days=days)
        users_ref = db.collection('users')
        
        filter_condition = firestore.FieldFilter('last_login', '>=', cutoff.timestamp())
        query = users_ref.where(filter=filter_condition)
        users = query.get()
        
        user_ids = [user.id for user in users]
        logger.info(f"Found {len(user_ids)} active users")
        return user_ids
        
    except Exception as e:
        logger.error(f"Error getting active users: {str(e)}")
        maintenance_errors.labels(task='get_active_users').inc()
        return []

async def cleanup_orphaned_storage(user_id: str) -> int:
    """Clean up storage files without corresponding Firestore documents"""
    try:
        # List all storage files
        prefix = f"users/{user_id}/"
        blobs = storage_bucket.list_blobs(prefix=prefix)
        deleted_count = 0

        # Get all valid document references
        docs = await db.collection('users').document(user_id)\
                      .collection('reports').get()
        valid_paths = {doc.get('file_path') for doc in docs}

        # Delete orphaned files
        for blob in blobs:
            if blob.name not in valid_paths:
                blob.delete()
                deleted_count += 1
                cleanup_files.inc()

        return deleted_count

    except Exception as e:
        logger.error(f"Error cleaning up orphaned storage for user {user_id}: {str(e)}")
        maintenance_errors.labels(task='cleanup_orphaned_storage').inc()
        return 0

async def update_storage_metrics(user_id: str) -> Dict[str, int]:
    """Update storage metrics for a user"""
    try:
        usage = await calculate_user_storage_usage(user_id)
        quota = await get_user_storage_quota(user_id)

        storage_usage.labels(user_id=user_id).set(usage)
        storage_quota.labels(user_id=user_id).set(quota['total'])

        metrics = {
            'usage': usage,
            'quota': quota['total'],
            'files_count': await count_user_files(user_id)
        }

        # Store metrics in Firestore
        await db.collection('users').document(user_id)\
               .collection('storage_metrics').document().set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'metrics': metrics
        })

        return metrics

    except Exception as e:
        logger.error(f"Error updating storage metrics for user {user_id}: {str(e)}")
        maintenance_errors.labels(task='update_storage_metrics').inc()
        return {}

async def count_user_files(user_id: str) -> int:
    """Count total files for a user"""
    try:
        prefix = f"users/{user_id}/"
        blobs = list(storage_bucket.list_blobs(prefix=prefix))
        return len(blobs)
    except Exception as e:
        logger.error(f"Error counting files for user {user_id}: {str(e)}")
        return 0

async def run_storage_maintenance():
    """Execute all storage maintenance tasks"""
    maintenance_task = MaintenanceTask('storage_maintenance')
    
    try:
        await maintenance_task.execute(async_maintenance_routine)
    except Exception as e:
        logger.error(f"Error in storage maintenance: {str(e)}")

async def async_maintenance_routine():
    """Main maintenance routine"""
    active_users = await get_active_users()
    logger.info(f"Running maintenance for {len(active_users)} active users")

    for user_id in active_users:
        try:
            # Clean up expired files
            expired_count = await cleanup_expired_files()
            logger.info(f"Cleaned up {expired_count} expired files for user {user_id}")

            # Clean up orphaned files
            orphaned_count = await cleanup_orphaned_storage(user_id)
            logger.info(f"Cleaned up {orphaned_count} orphaned files for user {user_id}")

            # Update metrics
            metrics = await update_storage_metrics(user_id)
            logger.info(f"Updated storage metrics for user {user_id}: {metrics}")

        except Exception as e:
            logger.error(f"Error in maintenance for user {user_id}: {str(e)}")
            continue

async def schedule_maintenance(interval_hours: int = 24):
    """Schedule periodic maintenance tasks"""
    while True:
        try:
            await run_storage_maintenance()
        except Exception as e:
            logger.error(f"Error in scheduled maintenance: {str(e)}")
            
        await asyncio.sleep(interval_hours * 3600)

def init_maintenance_schedule():
    """Initialize the maintenance schedule"""
    asyncio.create_task(schedule_maintenance()) 