"""
@purpose: Scheduled tasks for Firebase Storage maintenance and monitoring
@prereq: Requires configured Firebase Admin SDK and storage bucket
@reference: Used by server for automated maintenance
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict
from firebase_admin import firestore
from ..firebase.firebase import db
from ..firebase.report_storage import (
    cleanup_orphaned_files,
    monitor_storage_metrics,
    ReportStorageError
)

logger = logging.getLogger(__name__)

async def get_active_users(days: int = 30) -> List[str]:
    """
    Get list of users who have been active in the last N days
    
    Args:
        days (int): Number of days to look back
        
    Returns:
        List[str]: List of active user IDs
    """
    try:
        cutoff = datetime.now() - timedelta(days=days)
        users_ref = db.collection('users')
        
        # Use the new filter syntax
        filter_condition = firestore.FieldFilter('last_login', '>=', cutoff.timestamp())
        query = users_ref.where(filter=filter_condition)
        users = query.get()
        
        user_ids = [user.id for user in users]
        logger.info(f"Found {len(user_ids)} active users")
        return user_ids
        
    except Exception as e:
        logger.error(f"Error getting active users: {str(e)}")
        return []

async def run_storage_maintenance():
    """Executes storage maintenance tasks"""
    try:
        # Get active users
        active_users = await get_active_users()
        logger.info(f"Running maintenance for {len(active_users)} active users")
        
        # Process each user
        for user_id in active_users:
            try:
                # Clean up orphaned files
                await cleanup_orphaned_files(user_id)
                
                # Collect metrics
                metrics = await monitor_storage_metrics(user_id)
                
                # Store metrics in Firestore
                metrics_ref = db.collection('users').document(user_id)\
                              .collection('storage_metrics').document()
                              
                # Use set with merge option for better atomicity
                metrics_ref.set({
                    'timestamp': firestore.SERVER_TIMESTAMP,
                    'metrics': metrics
                }, merge=True)
                
                logger.info(f"Maintenance completed for user {user_id}")
                
            except ReportStorageError as e:
                logger.error(f"Error in maintenance for user {user_id}: {str(e)}")
                continue
                
    except Exception as e:
        logger.error(f"Error in storage maintenance: {str(e)}")

async def schedule_maintenance(interval_hours: int = 24):
    """
    Schedules periodic maintenance tasks
    
    Args:
        interval_hours (int): Hours between maintenance runs
    """
    while True:
        try:
            await run_storage_maintenance()
        except Exception as e:
            logger.error(f"Error in scheduled maintenance: {str(e)}")
            
        # Wait for next interval
        await asyncio.sleep(interval_hours * 3600)

# Initialize maintenance schedule
def init_maintenance_schedule():
    """Initializes the maintenance schedule"""
    asyncio.create_task(schedule_maintenance()) 