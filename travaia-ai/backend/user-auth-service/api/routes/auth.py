"""
Authentication routes for TRAVAIA User & Authentication Service
Handles user registration, login, logout, and token management
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import firebase_admin
from firebase_admin import auth, credentials
import os
from datetime import datetime
import logging

from services.user_service import UserService
from services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# Pydantic models
class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    preferred_language: str = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    expires_in: int

class UserResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    preferred_language: str
    created_at: datetime
    last_login: Optional[datetime]
    email_verified: bool

class UserSync(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None

# Dependency to get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and validate user from Firebase token"""
    try:
        token = credentials.credentials
        auth_service = AuthService()
        decoded_token = await auth_service.verify_token(token)
        user_id = decoded_token['uid']
        return user_id
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserRegistration):
    """Register a new user with Firebase Authentication and create user profile"""
    try:
        auth_service = AuthService()
        user_service = UserService()
        
        # Create Firebase user
        firebase_user = await auth_service.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.display_name
        )
        
        # Create user profile in Firestore
        user_profile = await user_service.create_user_profile(
            user_id=firebase_user.uid,
            email=user_data.email,
            display_name=user_data.display_name,
            preferred_language=user_data.preferred_language
        )
        
        return UserResponse(
            user_id=firebase_user.uid,
            email=user_profile["email"],
            display_name=user_profile["display_name"],
            preferred_language=user_profile["preferred_language"],
            created_at=user_profile["created_at"],
            last_login=None,
            email_verified=firebase_user.email_verified
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    """Authenticate user and return access token"""
    try:
        auth_service = AuthService()
        user_service = UserService()
        
        # Authenticate with Firebase
        token_data = await auth_service.authenticate_user(
            email=login_data.email,
            password=login_data.password
        )
        
        # Update last login timestamp
        await user_service.update_last_login(token_data["user_id"])
        
        return TokenResponse(
            access_token=token_data["access_token"],
            token_type="Bearer",
            user_id=token_data["user_id"],
            expires_in=3600  # 1 hour
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/logout")
async def logout_user(token: str = Depends(get_current_user)):
    """
    Logout user by invalidating their token
    """
    try:
        # In a real implementation, you would invalidate the token
        # For now, we'll just return a success message
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Logout failed")

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: str = Depends(get_current_user)):
    """Get current user's profile information"""
    try:
        user_service = UserService()
        user_profile = await user_service.get_user_profile(current_user)
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return UserResponse(
            user_id=current_user,
            email=user_profile["email"],
            display_name=user_profile["display_name"],
            preferred_language=user_profile["preferred_language"],
            created_at=user_profile["created_at"],
            last_login=user_profile.get("last_login"),
            email_verified=user_profile.get("email_verified", False)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user profile: {str(e)}"
        )

@router.post("/refresh-token")
async def refresh_token(current_user: str = Depends(get_current_user)):
    """Refresh user's access token"""
    try:
        auth_service = AuthService()
        new_token = await auth_service.refresh_user_token(current_user)
        
        return TokenResponse(
            access_token=new_token,
            token_type="Bearer",
            user_id=current_user,
            expires_in=3600
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Token refresh failed: {str(e)}"
        )

@router.post("/verify-email")
async def send_email_verification(current_user: str = Depends(get_current_user)):
    """Send email verification to user"""
    try:
        auth_service = AuthService()
        await auth_service.send_email_verification(current_user)
        
        return {"message": "Email verification sent", "user_id": current_user}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send email verification: {str(e)}"
        )

@router.post("/reset-password")
async def reset_password(email: EmailStr):
    """Send password reset email"""
    try:
        auth_service = AuthService()
        await auth_service.send_password_reset_email(email)
        
        return {"message": "Password reset email sent", "email": email}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send password reset email: {str(e)}"
        )

@router.post("/sync", response_model=UserResponse)
async def sync_user(user_data: UserSync, current_user: str = Depends(get_current_user)):
    """Sync user data from frontend Firebase auth to backend"""
    try:
        # Verify the token user matches the sync data
        if current_user != user_data.uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Token user ID does not match sync data"
            )
        
        user_service = UserService()
        
        # Check if user profile exists
        existing_profile = await user_service.get_user_profile(user_data.uid)
        
        if existing_profile:
            # Update existing profile with latest data from Firebase
            update_data = {
                "display_name": user_data.display_name or existing_profile.get("display_name"),
                "avatar_url": user_data.photo_url or existing_profile.get("avatar_url"),
                "last_login": datetime.utcnow()
            }
            await user_service.update_user_profile(user_data.uid, update_data)
            updated_profile = await user_service.get_user_profile(user_data.uid)
            profile = updated_profile
        else:
            # Create new profile from Firebase user data
            profile = await user_service.create_user_profile(
                user_id=user_data.uid,
                email=user_data.email,
                display_name=user_data.display_name or user_data.email.split('@')[0],
                preferred_language="en",
                avatar_url=user_data.photo_url
            )
        
        return UserResponse(
            user_id=user_data.uid,
            email=profile["email"],
            display_name=profile["display_name"],
            preferred_language=profile.get("preferred_language", "en"),
            created_at=profile["created_at"],
            last_login=profile.get("last_login"),
            email_verified=True  # Assume verified since coming from Firebase
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User sync failed: {str(e)}"
        )

