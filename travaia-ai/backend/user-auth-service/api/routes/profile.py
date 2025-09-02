"""
Profile management routes for TRAVAIA User & Authentication Service
Handles user profile updates, settings, and preferences
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

from services.user_service import UserService
from .auth import get_current_user

router = APIRouter()

# Pydantic models
class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    preferred_language: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

class UserSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    interview_reminders: bool = True
    job_alerts: bool = True
    weekly_reports: bool = True
    privacy_level: str = "private"  # private, friends, public
    theme_preference: str = "auto"  # light, dark, auto

class ProfileResponse(BaseModel):
    user_id: str
    email: str
    display_name: str
    preferred_language: str
    bio: Optional[str]
    location: Optional[str]
    phone: Optional[str]
    linkedin_url: Optional[str]
    github_url: Optional[str]
    portfolio_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    email_verified: bool
    profile_completion: float  # Percentage of profile completion

@router.get("/", response_model=ProfileResponse)
async def get_user_profile(current_user: str = Depends(get_current_user)):
    """Get detailed user profile information"""
    try:
        user_service = UserService()
        profile = await user_service.get_detailed_profile(current_user)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Calculate profile completion percentage
        completion = user_service.calculate_profile_completion(profile)
        
        return ProfileResponse(
            user_id=current_user,
            email=profile["email"],
            display_name=profile["display_name"],
            preferred_language=profile["preferred_language"],
            bio=profile.get("bio"),
            location=profile.get("location"),
            phone=profile.get("phone"),
            linkedin_url=profile.get("linkedin_url"),
            github_url=profile.get("github_url"),
            portfolio_url=profile.get("portfolio_url"),
            created_at=profile["created_at"],
            updated_at=profile["updated_at"],
            last_login=profile.get("last_login"),
            email_verified=profile.get("email_verified", False),
            profile_completion=completion
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve profile: {str(e)}"
        )

@router.put("/", response_model=ProfileResponse)
async def update_user_profile(
    profile_data: ProfileUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user profile information"""
    try:
        user_service = UserService()
        
        # Filter out None values
        update_data = {k: v for k, v in profile_data.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No valid fields provided for update"
            )
        
        updated_profile = await user_service.update_user_profile(current_user, update_data)
        
        # Calculate profile completion percentage
        completion = user_service.calculate_profile_completion(updated_profile)
        
        return ProfileResponse(
            user_id=current_user,
            email=updated_profile["email"],
            display_name=updated_profile["display_name"],
            preferred_language=updated_profile["preferred_language"],
            bio=updated_profile.get("bio"),
            location=updated_profile.get("location"),
            phone=updated_profile.get("phone"),
            linkedin_url=updated_profile.get("linkedin_url"),
            github_url=updated_profile.get("github_url"),
            portfolio_url=updated_profile.get("portfolio_url"),
            created_at=updated_profile["created_at"],
            updated_at=updated_profile["updated_at"],
            last_login=updated_profile.get("last_login"),
            email_verified=updated_profile.get("email_verified", False),
            profile_completion=completion
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.get("/settings", response_model=UserSettings)
async def get_user_settings(current_user: str = Depends(get_current_user)):
    """Get user settings and preferences"""
    try:
        user_service = UserService()
        settings = await user_service.get_user_settings(current_user)
        
        return UserSettings(**settings) if settings else UserSettings()
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve settings: {str(e)}"
        )

@router.put("/settings", response_model=UserSettings)
async def update_user_settings(
    settings: UserSettings,
    current_user: str = Depends(get_current_user)
):
    """Update user settings and preferences"""
    try:
        user_service = UserService()
        updated_settings = await user_service.update_user_settings(
            current_user, 
            settings.dict()
        )
        
        return UserSettings(**updated_settings)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )

@router.delete("/")
async def delete_user_account(current_user: str = Depends(get_current_user)):
    """Delete user account and all associated data"""
    try:
        user_service = UserService()
        await user_service.delete_user_account(current_user)
        
        return {
            "message": "User account successfully deleted",
            "user_id": current_user,
            "deleted_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )

@router.get("/completion")
async def get_profile_completion(current_user: str = Depends(get_current_user)):
    """Get profile completion status and suggestions"""
    try:
        user_service = UserService()
        profile = await user_service.get_detailed_profile(current_user)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        completion_data = user_service.get_profile_completion_details(profile)
        
        return {
            "completion_percentage": completion_data["percentage"],
            "completed_fields": completion_data["completed"],
            "missing_fields": completion_data["missing"],
            "suggestions": completion_data["suggestions"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get completion status: {str(e)}"
        )

@router.post("/language")
async def update_preferred_language(
    language: str,
    current_user: str = Depends(get_current_user)
):
    """Update user's preferred language"""
    try:
        # Validate language code
        supported_languages = ["en", "es", "fr", "de", "ar"]
        if language not in supported_languages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported language. Supported: {supported_languages}"
            )
        
        user_service = UserService()
        await user_service.update_user_profile(
            current_user, 
            {"preferred_language": language}
        )
        
        return {
            "message": "Language preference updated",
            "user_id": current_user,
            "preferred_language": language
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update language: {str(e)}"
        )
