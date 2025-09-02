"""
Domain models for API responses in the Interview Session Service.
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


# =============================================================================
# Core Domain Models
# =============================================================================

class InterviewSession(BaseModel):
    session_id: str
    user_id: str
    session_type: str
    interview_type: str
    status: str
    created_at: datetime
    updated_at: datetime
    ended_at: Optional[datetime] = None
    job_application_id: Optional[str] = None
    language: str
    difficulty: str
    question_count: int
    time_limit_minutes: int
    feedback: Optional[Dict[str, Any]] = {}
    analytics: Optional[Dict[str, Any]] = {}
    recording_url: Optional[str] = None
    scores: Optional[Dict[str, Any]] = {}
    responses: Optional[List[Dict[str, Any]]] = []

class Pipeline(BaseModel):
    pipeline_id: str
    session_id: str
    user_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    room_url: Optional[str] = None
    interviewer_persona: str
    voice_config: Dict[str, Any]
    ai_config: Dict[str, Any]

class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: datetime

class Transcript(BaseModel):
    pipeline_id: str
    entries: List[TranscriptEntry]
    word_count: int
    duration_seconds: float

class InterviewerPersona(BaseModel):
    id: str
    name: str
    description: str
    system_prompt: str

class VoiceConfiguration(BaseModel):
    id: str
    name: str
    provider: str
    language_code: str
    speaking_rate: float
    pitch: float


# =============================================================================
# API Response Models
# =============================================================================

class SessionResponse(BaseModel):
    success: bool
    session: InterviewSession
    message: Optional[str] = None

class SessionListResponse(BaseModel):
    success: bool
    sessions: List[InterviewSession]
    count: int

class PipelineResponse(BaseModel):
    success: bool
    pipeline: Pipeline
    message: Optional[str] = None

class PipelineStatusResponse(BaseModel):
    success: bool
    status: Dict[str, Any]

class QuestionResponse(BaseModel):
    success: bool
    question: Dict[str, Any]
    message: Optional[str] = None

class TranscriptResponse(BaseModel):
    success: bool
    transcript: Transcript

class PersonaListResponse(BaseModel):
    success: bool
    personas: List[InterviewerPersona]

class VoiceConfigListResponse(BaseModel):
    success: bool
    voice_configs: List[VoiceConfiguration]

class GenericSuccessResponse(BaseModel):
    success: bool
    message: str

