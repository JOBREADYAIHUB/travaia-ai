"""
Shared Authentication Utilities
Firebase Auth integration for Resume Intake Service
"""

import os
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import auth, credentials
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    try:
        # Try to use service account key file
        service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
        else:
            # Use default credentials (for Cloud Run)
            cred = credentials.ApplicationDefault()
        
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
        raise

security = HTTPBearer()

async def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Verify Firebase ID token and return decoded token
    """
    try:
        if not credentials:
            raise HTTPException(
                status_code=401,
                detail="Authorization header missing"
            )
        
        token = credentials.credentials
        
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        
        if not decoded_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )
        
        return decoded_token
        
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token has expired"
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Authentication token has been revoked"
        )
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

async def get_current_user(
    token_data: Dict[str, Any] = Depends(verify_firebase_token)
) -> Dict[str, Any]:
    """
    Get current user information from verified token
    """
    try:
        user_id = token_data.get("uid")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user token"
            )
        
        # Get additional user information if needed
        user_record = auth.get_user(user_id)
        
        return {
            "uid": user_id,
            "email": token_data.get("email"),
            "email_verified": token_data.get("email_verified", False),
            "name": token_data.get("name"),
            "picture": token_data.get("picture"),
            "firebase_user": {
                "disabled": user_record.disabled,
                "email_verified": user_record.email_verified,
                "provider_data": [
                    {
                        "uid": provider.uid,
                        "email": provider.email,
                        "provider_id": provider.provider_id
                    }
                    for provider in user_record.provider_data
                ]
            }
        }
        
    except auth.UserNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    except Exception as e:
        logger.error(f"Error getting user information: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve user information"
        )

async def verify_user_access(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> bool:
    """
    Verify that the current user has access to the specified user's data
    """
    if current_user["uid"] != user_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: insufficient permissions"
        )
    return True

def get_user_id_from_token(token_data: Dict[str, Any]) -> str:
    """
    Extract user ID from token data
    """
    user_id = token_data.get("uid")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid user token: missing user ID"
        )
    return user_id
