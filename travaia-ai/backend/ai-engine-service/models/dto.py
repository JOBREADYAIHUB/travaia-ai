"""
Data Transfer Objects (DTOs) for ai-engine-service. 

These models define the structure of data for API requests.
"""

from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# =============================================================================
# Speech Service DTOs
# =============================================================================


class SpeechToTextRequest(BaseModel):
    audio_content: str  # Base64 encoded audio
    language_code: str = "en-US"
    encoding: str = "WEBM_OPUS"


class BatchTextToSpeechRequest(BaseModel):
    requests: List[TextToSpeechRequest]

class TextToSpeechRequest(BaseModel):
    text: str
    language_code: str = "en-US"
    voice_name: Optional[str] = None
    speaking_rate: float = 1.0

# =============================================================================
# Questions Service DTOs
# =============================================================================

class InterviewQuestionsRequest(BaseModel):
    job_description: str
    user_profile: Dict[str, Any]
    difficulty_level: str = "medium"  # easy, medium, hard
    language: str = "en"
    question_count: int = 10
    question_types: List[str] = ["behavioral", "technical", "situational"]
    specific_skills: List[str] = []


class ValidateQuestionsRequest(BaseModel):
    questions: List[str]

# =============================================================================
# Feedback Service DTOs
# =============================================================================

class ResponseAnalysisRequest(BaseModel):
    question: str
    response: str
    job_description: str
    context: Optional[Dict[str, Any]] = None
    language: str = "en"  # ISO language code (en, es, fr, de, etc.)

class InterviewFeedbackRequest(BaseModel):
    interview_id: str
    job_description: str
    interview_transcript: str
    question_responses: List[Dict[str, Any]]
    interview_metrics: Optional[Dict[str, Any]] = None
    language: str = "en"  # ISO language code (en, es, fr, de, etc.)

class ComprehensiveFeedbackRequest(BaseModel):
    interview_id: str
    responses: List[Dict[str, Any]]
    user_profile: Dict[str, Any]
    job_title: Optional[str] = None
    duration: Optional[int] = None
    language: str = "en"  # ISO language code (en, es, fr, de, etc.)

# =============================================================================
# Cache Service DTOs
# =============================================================================

class CacheInvalidateRequest(BaseModel):
    prefix: Optional[str] = None

# =============================================================================
# Auth Service DTOs
# =============================================================================

class TokenRequest(BaseModel):
    service_name: str
    roles: List[str]

class TokenRevokeRequest(BaseModel):
    token: str

# =============================================================================
# Analysis Service DTOs
# =============================================================================

class JobAnalysisRequest(BaseModel):
    user_profile: Dict[str, Any]
    job_description: str
    user_id: str
    analysis_type: str = "comprehensive"  # comprehensive, quick, detailed
    language: str = "en"  # ISO language code (en, es, fr, de, etc.)


# =============================================================================
# Monitoring Service DTOs
# =============================================================================


class TrackErrorRequest(BaseModel):
    error_message: str
    category: str
    severity: str
    component: str
    context: Optional[Dict[str, Any]] = None
