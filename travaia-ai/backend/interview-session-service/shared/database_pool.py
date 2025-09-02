"""
Simplified database pool for interview-session-service
"""

import asyncio
from google.cloud import firestore

def get_firestore_client():
    """Get Firestore client"""
    return firestore.Client()

async def connection_pool_cleanup_task(project_id: str):
    """Mock connection pool cleanup task"""
    while True:
        await asyncio.sleep(300)  # Sleep for 5 minutes
