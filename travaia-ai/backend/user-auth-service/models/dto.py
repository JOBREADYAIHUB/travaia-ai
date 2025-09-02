"""
Pydantic Data Transfer Objects for TRAVAIA User & Authentication Service
Defines request models for user profile, progress, and settings updates
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Profile Data Models
class UserSkill(BaseModel):
    name: str
    level: Optional[str] = None
    years: Optional[int] = None
    verified: Optional[bool] = False

class UserEducation(BaseModel):
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[float] = None
    description: Optional[str] = None

class UserExperience(BaseModel):
    company: str
    position: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    skills_used: Optional[List[str]] = []

class UserProfileUpdate(BaseModel):
    """Model for updating user profile_data field"""
    skills: Optional[List[UserSkill]] = None
    education: Optional[List[UserEducation]] = None
    experience: Optional[List[UserExperience]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None

# Progress Models
class UserProgressUpdate(BaseModel):
    """Model for updating user progress field"""
    xp: Optional[int] = Field(None, ge=0)
    level: Optional[int] = Field(None, ge=1)
    current_streak: Optional[int] = Field(None, ge=0)
    longest_streak: Optional[int] = Field(None, ge=0)
    last_activity: Optional[datetime] = None

# Settings Models
class NotificationSettings(BaseModel):
    email: Optional[bool] = True
    push: Optional[bool] = True
    interview_reminders: Optional[bool] = True
    job_alerts: Optional[bool] = True

class PrivacySettings(BaseModel):
    profile_visibility: Optional[str] = Field(None, pattern="^(private|friends|public)$")
    data_sharing: Optional[bool] = False

class PreferenceSettings(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(light|dark|system)$")
    language: Optional[str] = Field(None, pattern="^(en|es|fr|de|ar)$")

class UserSettingsUpdate(BaseModel):
    """Model for updating user settings field"""
    notifications: Optional[NotificationSettings] = None
    privacy: Optional[PrivacySettings] = None
    preferences: Optional[PreferenceSettings] = None
