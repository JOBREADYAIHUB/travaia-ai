"""
Shared Firebase Authentication Middleware for TRAVAIA Microservices
"""

import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import structlog
import os
from typing import Dict, Any, Optional

logger = structlog.get_logger(__name__)
security = HTTPBearer()

class FirebaseAuthMiddleware:
    def __init__(self):
        self.app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Use Google Application Default Credentials in Cloud Run
                cred = credentials.ApplicationDefault()
                self.app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized successfully")
            else:
                self.app = firebase_admin.get_app()
                logger.info("Using existing Firebase Admin SDK instance")
                
        except Exception as e:
            logger.error("Failed to initialize Firebase Admin SDK", error=str(e))
            self.app = None
    
    async def verify_token(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """Verify Firebase ID token and return user claims"""
        try:
            if not self.app:
                raise HTTPException(status_code=500, detail="Firebase not initialized")
            
            # Extract token from Bearer header
            id_token = credentials.credentials
            
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            
            # Extract user information
            user_data = {
                "user_id": decoded_token.get("uid"),
                "email": decoded_token.get("email"),
                "email_verified": decoded_token.get("email_verified", False),
                "name": decoded_token.get("name"),
                "picture": decoded_token.get("picture"),
                "firebase_claims": decoded_token
            }
            
            logger.info("Token verified successfully", user_id=user_data["user_id"])
            return user_data
            
        except auth.InvalidIdTokenError:
            logger.warning("Invalid ID token provided")
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        except auth.ExpiredIdTokenError:
            logger.warning("Expired ID token provided")
            raise HTTPException(status_code=401, detail="Authentication token has expired")
        except Exception as e:
            logger.error("Token verification failed", error=str(e))
            raise HTTPException(status_code=401, detail="Authentication failed")

# Global instance
firebase_auth = FirebaseAuthMiddleware()

# Dependency function for FastAPI routes
async def get_current_user(user_data: Dict[str, Any] = Depends(firebase_auth.verify_token)) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user"""
    return user_data

# Optional authentication (returns None if no token provided)
async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """FastAPI dependency for optional authentication"""
    if not credentials:
        return None
    
    try:
        return await firebase_auth.verify_token(credentials)
    except HTTPException:
        return None
