"""
Pydantic Domain Models for TRAVAIA User & Authentication Service
Defines response models for user profile, progress, and settings
"""

from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

# Response Models
class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class UserProfileResponse(BaseModel):
    """Response model for user profile data"""
    user_id: str
    email: str
    display_name: str
    profile_data: Optional[Dict[str, Any]] = None
    updated_at: datetime

class UserProgressResponse(BaseModel):
    """Response model for user progress data"""
    user_id: str
    progress: Optional[Dict[str, Any]] = None
    updated_at: datetime

class UserSettingsResponse(BaseModel):
    """Response model for user settings data"""
    user_id: str
    settings: Optional[Dict[str, Any]] = None
    updated_at: datetime
