"""
Data Transfer Objects (DTOs) for CareerGPT Coach Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Coaching Session DTOs
# =============================================================================

class CoachingSessionRequest(BaseModel):
    user_id: str
    session_type: str = Field(..., pattern="^(career_guidance|interview_prep|resume_review|salary_negotiation)$")
    context: Optional[Dict[str, Any]] = {}
    language: str = "en"

class ChatMessageRequest(BaseModel):
    session_id: str
    user_id: str
    message: str = Field(..., min_length=1, max_length=2000)
    message_type: str = "text"  # "text", "voice", "file"

class SessionEndRequest(BaseModel):
    session_id: str
    user_id: str
    feedback: Optional[Dict[str, Any]] = {}
    rating: Optional[int] = Field(None, ge=1, le=5)

# =============================================================================
# Career Analysis DTOs
# =============================================================================

class CareerAnalysisRequest(BaseModel):
    user_id: str
    analysis_type: str = Field(..., pattern="^(skills_gap|career_path|market_trends|salary_analysis)$")
    user_profile: Dict[str, Any]
    target_role: Optional[str] = None
    target_industry: Optional[str] = None

class ResumeReviewRequest(BaseModel):
    user_id: str
    resume_content: str = Field(..., min_length=100)
    target_job: Optional[str] = None
    review_focus: List[str] = ["content", "format", "keywords", "ats_optimization"]

class InterviewPrepRequest(BaseModel):
    user_id: str
    job_description: str = Field(..., min_length=50)
    interview_type: str = Field(..., pattern="^(behavioral|technical|case_study|panel)$")
    preparation_level: str = Field("intermediate", pattern="^(beginner|intermediate|advanced)$")

# =============================================================================
# Personalization DTOs
# =============================================================================

class UserPreferencesRequest(BaseModel):
    user_id: str
    coaching_style: str = Field("supportive", pattern="^(direct|supportive|analytical|motivational)$")
    communication_frequency: str = Field("weekly", pattern="^(daily|weekly|biweekly|monthly)$")
    focus_areas: List[str] = []
    goals: List[str] = []