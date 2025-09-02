"""
Database Pool and Connection Management
Firestore client management for Resume Intake Service
"""

import os
from typing import Optional
import firebase_admin
from firebase_admin import firestore
import logging

logger = logging.getLogger(__name__)

# Global Firestore client
_firestore_client: Optional[firestore.Client] = None

def get_firestore_client() -> firestore.Client:
    """
    Get or create Firestore client instance
    """
    global _firestore_client
    
    if _firestore_client is None:
        try:
            # Initialize Firestore client
            _firestore_client = firestore.client()
            logger.info("Firestore client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore client: {str(e)}")
            raise Exception(f"Database connection failed: {str(e)}")
    
    return _firestore_client

async def test_database_connection() -> bool:
    """
    Test database connection
    """
    try:
        db = get_firestore_client()
        # Try to read from a test collection
        test_doc = db.collection("_health_check").document("test").get()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {str(e)}")
        return False

def close_database_connection():
    """
    Close database connection (cleanup)
    """
    global _firestore_client
    if _firestore_client:
        # Firestore client doesn't have explicit close method
        # but we can reset the reference
        _firestore_client = None
        logger.info("Database connection closed")
