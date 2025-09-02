"""
Shared Firebase Authentication Middleware for TRAVAIA Backend Services
"""

import os
from typing import Dict, Any, Optional
import base64
import json
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer
import firebase_admin
from firebase_admin import credentials
import structlog

# Initialize logger
logger = structlog.get_logger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    try:
        # Check if Firebase is already initialized
        app = firebase_admin.get_app()
        logger.info(f"Firebase Admin SDK already initialized for project: {app.project_id}")
    except ValueError:
        # Initialize Firebase Admin SDK
        try:
            project_id = "travaia-e1310"
            
            logger.info(f"Initializing Firebase for project: {project_id}")
            
            # Use default credentials (Cloud Run service account)
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': project_id
            })
            logger.info(f"Firebase initialized with default credentials for project: {project_id}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {type(e).__name__}: {e}")
            raise

# Firebase will be initialized by the main application's startup event.

# Security scheme - auto_error=False to handle missing tokens properly
security = HTTPBearer(auto_error=False)



async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    FastAPI dependency to get current authenticated user
    
    Args:
        credentials: HTTP Bearer credentials from request
        
    Returns:
        User information from verified token
        
    Raises:
        HTTPException: If authentication fails
    """
    user_info_header = request.headers.get("X-Apigateway-Api-Userinfo")

    if not user_info_header:
        logger.error("X-Apigateway-Api-Userinfo header missing")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User info header missing. Direct access is not allowed."
        )

    try:
        # The header is base64url encoded and may lack padding.
        user_info_header += '=' * (-len(user_info_header) % 4)
        decoded_user_info = base64.urlsafe_b64decode(user_info_header).decode('utf-8')
        user_claims = json.loads(decoded_user_info)

        # Reconstruct the user_info object
        user_info = {
            "user_id": user_claims.get("user_id"),
            "email": user_claims.get("email"),
            "email_verified": user_claims.get("email_verified", False),
            "name": user_claims.get("name"),
            "picture": user_claims.get("picture"),
            "firebase_claims": user_claims
        }

        logger.info(f"Authenticated user via API Gateway: {user_info.get('user_id')}")

    except Exception as e:
        logger.error(f"Failed to decode X-Apigateway-Api-Userinfo header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user info header"
        )
    
    # Ensure user_id is present
    if not user_info.get("user_id"):
        logger.error("No user_id in verified token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user information in token"
        )
    
    return user_info

async def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    FastAPI dependency to get current user if authenticated, None otherwise.
    This relies on the X-Apigateway-Api-Userinfo header set by the API Gateway.
    """
    user_info_header = request.headers.get("X-Apigateway-Api-Userinfo")

    if not user_info_header:
        return None

    try:
        # The header is base64url encoded and may lack padding.
        user_info_header += '=' * (-len(user_info_header) % 4)
        decoded_user_info = base64.urlsafe_b64decode(user_info_header).decode('utf-8')
        user_claims = json.loads(decoded_user_info)
        return {
            "user_id": user_claims.get("user_id"),
            "email": user_claims.get("email"),
            "email_verified": user_claims.get("email_verified", False),
            "name": user_claims.get("name"),
            "picture": user_claims.get("picture"),
            "firebase_claims": user_claims
        }
    except Exception as e:
        logger.warning(f"Could not decode optional user info header: {e}")
        return None

def require_user_id(user_info: Dict[str, Any]) -> str:
    """
    Extract and validate user_id from user info
    
    Args:
        user_info: User information from authentication
        
    Returns:
        User ID string
        
    Raises:
        HTTPException: If user_id is missing
    """
    user_id = user_info.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in authentication token"
        )
    return user_id
