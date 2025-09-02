"""
Data Transfer Objects (DTOs) for API requests in the Interview Session Service.
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional


# =============================================================================
# Session Service DTOs
# =============================================================================

class SessionCreateRequest(BaseModel):
    user_id: str
    session_type: Optional[str] = "voice"  # voice, video, text
    interview_type: Optional[str] = "general"  # general, technical, behavioral
    job_application_id: Optional[str] = None
    language: Optional[str] = "en"
    difficulty: Optional[str] = "medium"
    question_count: Optional[int] = 5
    time_limit_minutes: Optional[int] = 30

class SessionStartRequest(BaseModel):
    user_id: str

class SessionEndRequest(BaseModel):
    user_id: str
    feedback: Optional[Dict[str, Any]] = {}
    analytics: Optional[Dict[str, Any]] = {}
    recording_url: Optional[str] = None
    scores: Optional[Dict[str, Any]] = {}
    responses: Optional[List[Dict[str, Any]]] = []


# =============================================================================
# Pipecat Service DTOs
# =============================================================================

class PipelineCreateRequest(BaseModel):
    session_id: str
    user_id: str
    interview_type: Optional[str] = "general"
    language: Optional[str] = "en"
    interviewer_persona: Optional[str] = "professional"
    voice_config: Optional[Dict[str, Any]] = {}
    ai_config: Optional[Dict[str, Any]] = {}

class PipelineStartRequest(BaseModel):
    user_id: str
    room_url: Optional[str] = None

class PipelineStopRequest(BaseModel):
    user_id: str
    reason: Optional[str] = "user_ended"

class QuestionRequest(BaseModel):
    user_id: str
    question_type: Optional[str] = "behavioral"
    context: Optional[Dict[str, Any]] = {}

