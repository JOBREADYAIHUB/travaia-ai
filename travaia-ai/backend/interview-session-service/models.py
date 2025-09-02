"""
Pydantic models for TRAVAIA Interview Session Service
Defines request/response models for interviews, attempts, pagination, and API responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any, Union
from datetime import datetime

# Pagination Models
class PaginationParams(BaseModel):
    """Query parameters for pagination"""
    page: int = Field(default=1, ge=1, description="Page number (starts from 1)")
    limit: int = Field(default=10, ge=1, le=100, description="Number of items per page (max 100)")

class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

# Interview Configuration
class InterviewConfiguration(BaseModel):
    """Interview configuration model"""
    duration_minutes: int = Field(..., ge=1, le=480, description="Interview duration in minutes")
    difficulty_level: str = Field(..., description="Interview difficulty level")
    focus_areas: List[str] = Field(..., description="Areas of focus for the interview")
    language: str = Field(..., description="Interview language")

# Interview Models
class Interview(BaseModel):
    """Interview model for Firestore storage"""
    interview_id: str
    user_id: str
    application_id: str
    interview_type: str = Field(..., description="Type of interview: mock, practice, or real")
    configuration: InterviewConfiguration
    status: str = Field(..., description="Interview status: scheduled, in_progress, completed, or cancelled")
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class InterviewCreateRequest(BaseModel):
    """Request model for creating interview sessions"""
    application_id: str = Field(..., description="ID of the associated application")
    interview_type: Literal['mock', 'practice', 'real'] = Field(..., description="Type of interview: mock, practice, or real")
    configuration: InterviewConfiguration
    status: Literal['scheduled', 'in_progress', 'completed', 'cancelled'] = Field(..., description="Initial status of the interview session")

# Interview Attempt Models
class InterviewAttempt(BaseModel):
    """Interview attempt model for Firestore storage"""
    attempt_id: str
    user_id: str
    interview_id: str
    status: str = Field(..., description="Attempt status: in_progress, completed, or cancelled")
    score: int = Field(default=0, ge=0, le=100, description="Score between 0 and 100")
    start_time: datetime
    end_time: Optional[datetime] = None
    recording_url: Optional[str] = None
    feedback_report_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class InterviewAttemptCreateRequest(BaseModel):
    """Request model for creating a new interview attempt"""
    pass  # Empty model for starting an attempt - all fields are server-generated

class InterviewAttemptUpdateRequest(BaseModel):
    """Request model for updating an existing interview attempt"""
    status: Optional[Literal['in_progress', 'completed', 'cancelled']] = None
    score: Optional[int] = Field(None, ge=0, le=100, description="Score between 0 and 100")
    end_time: Optional[datetime] = None
    recording_url: Optional[str] = None
    feedback_report_id: Optional[str] = None

# Interview Question Set Models
class InterviewQuestionSet(BaseModel):
    """Interview question set model for Firestore storage"""
    question_set_id: str
    user_id: str
    name: str
    language: str
    questions: List[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class InterviewQuestionSetCreateRequest(BaseModel):
    """Request model for creating interview question sets"""
    name: str = Field(..., min_length=1, max_length=200, description="Name of the question set")
    language: str = Field(..., min_length=2, max_length=5, description="Language code (e.g., 'en', 'es')")
    questions: List[str] = Field(..., min_items=1, max_items=100, description="List of interview questions")

class InterviewQuestionSetUpdateRequest(BaseModel):
    """Request model for updating interview question sets (partial updates allowed)"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Name of the question set")
    language: Optional[str] = Field(None, min_length=2, max_length=5, description="Language code (e.g., 'en', 'es')")
    questions: Optional[List[str]] = Field(None, min_items=1, max_items=100, description="List of interview questions")

# API Response Models
class ApiResponse(BaseModel):
    """Standard API response wrapper"""
    success: bool
    message: str
    data: Optional[Union[Dict[str, Any], List[Any]]] = None
    error: Optional[str] = None
    pagination: Optional[PaginationMeta] = None
