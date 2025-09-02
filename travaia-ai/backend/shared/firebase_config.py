"""
Production-Ready Firebase and Google Cloud Configuration
Handles credential initialization for Cloud Run deployment
"""

import os
import json
import logging
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud import aiplatform
import vertexai

logger = logging.getLogger(__name__)

class CloudConfig:
    """Centralized configuration for Firebase and Google Cloud services"""
    
    def __init__(self):
        self.project_id = self._get_project_id()
        self.region = os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        # Service availability flags
        self.firebase_available = False
        self.firestore_available = False
        self.vertex_ai_available = False
        
        # Initialize services
        self._initialize_firebase()
        self._initialize_vertex_ai()
        
        logger.info(f"CloudConfig initialized for project: {self.project_id}")
    
    def _get_project_id(self) -> str:
        """Get project ID from multiple sources with fallback"""
        # Try environment variable first
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if project_id and project_id.strip():
            return project_id.strip()
        
        # Try GCP metadata service (works in Cloud Run)
        try:
            import requests
            metadata_url = "http://metadata.google.internal/computeMetadata/v1/project/project-id"
            headers = {"Metadata-Flavor": "Google"}
            response = requests.get(metadata_url, headers=headers, timeout=5)
            if response.status_code == 200:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Could not get project ID from metadata: {e}")
        
        # Fallback to default
        return "travaia-e1310"
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK with proper error handling"""
        try:
            if not firebase_admin._apps:
                # Check for service account key file
                service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                
                if service_account_path and os.path.exists(service_account_path):
                    logger.info("Using service account credentials from file")
                    cred = credentials.Certificate(service_account_path)
                else:
                    # Use Application Default Credentials (works in Cloud Run)
                    logger.info("Using Application Default Credentials")
                    cred = credentials.ApplicationDefault()
                
                # Initialize with explicit project ID
                firebase_admin.initialize_app(cred, {
                    'projectId': self.project_id
                })
                
                logger.info(f"Firebase Admin initialized for project: {self.project_id}")
                self.firebase_available = True
                
                # Test Firestore connection
                try:
                    db = firestore.client()
                    # Simple test query
                    db.collection('_test').limit(1).get()
                    self.firestore_available = True
                    logger.info("Firestore client initialized successfully")
                except Exception as e:
                    logger.warning(f"Firestore not available: {e}")
                    self.firestore_available = False
                    
            else:
                self.firebase_available = True
                self.firestore_available = True
                logger.info("Using existing Firebase Admin instance")
                
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
            self.firebase_available = False
            self.firestore_available = False
    
    def _initialize_vertex_ai(self):
        """Initialize Vertex AI with proper error handling"""
        try:
            if self.project_id:
                vertexai.init(project=self.project_id, location=self.region)
                logger.info(f"Vertex AI initialized for project: {self.project_id}")
                self.vertex_ai_available = True
            else:
                logger.warning("No project ID available for Vertex AI")
                self.vertex_ai_available = False
        except Exception as e:
            logger.error(f"Vertex AI initialization failed: {e}")
            self.vertex_ai_available = False
    
    def get_firestore_client(self):
        """Get Firestore client with availability check"""
        if not self.firestore_available:
            raise RuntimeError("Firestore not available")
        return firestore.client()
    
    def get_auth_client(self):
        """Get Firebase Auth client with availability check"""
        if not self.firebase_available:
            raise RuntimeError("Firebase Auth not available")
        return auth
    
    def is_service_available(self, service: str) -> bool:
        """Check if a specific service is available"""
        service_map = {
            'firebase': self.firebase_available,
            'firestore': self.firestore_available,
            'vertex_ai': self.vertex_ai_available
        }
        return service_map.get(service, False)
    
    def get_status(self) -> Dict[str, Any]:
        """Get configuration status for health checks"""
        return {
            "project_id": self.project_id,
            "region": self.region,
            "environment": self.environment,
            "services": {
                "firebase": self.firebase_available,
                "firestore": self.firestore_available,
                "vertex_ai": self.vertex_ai_available
            }
        }

# Global configuration instance
cloud_config = CloudConfig()
