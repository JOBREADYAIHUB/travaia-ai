"""
Domain models for ai-engine-service.

These models define the structure of data for API responses.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# =============================================================================
# Speech Service Models
# =============================================================================


class TextToSpeechResponse(BaseModel):
    audio_content: str  # Base64 encoded
    duration_estimate: float
    language_code: str
    voice_name: str
    cached: bool = False


class SpeechToTextResponse(BaseModel):
    transcript: str
    confidence: float
    words: List[Dict[str, Any]]
    duration: float
    language_code: str
    word_count: int


class BatchTextToSpeechResponse(BaseModel):
    results: List[Dict[str, Any]]  # Can contain success or error dicts
    batch_size: int
    success_count: int


class Voice(BaseModel):
    name: str
    ssml_gender: str
    natural_sample_rate_hertz: int


class SupportedVoicesResponse(BaseModel):
    voices: List[Voice]
    total_count: int
    language_filter: Optional[str] = None


class SpeechLanguage(BaseModel):
    code: str
    name: str
    tts: bool
    stt: bool


class SupportedSpeechLanguagesResponse(BaseModel):
    languages: List[SpeechLanguage]
    total_count: int

# =============================================================================
# Questions Service Models
# =============================================================================


class QuestionTemplate(BaseModel):
    category: str
    templates: List[str]


class QuestionTemplatesResponse(BaseModel):
    templates: List[QuestionTemplate]
    total_categories: int


class ValidateQuestionsResponse(BaseModel):
    questions: List[str]
    quality_scores: List[float]
    suggestions: List[str]
    overall_quality: str

class InterviewQuestion(BaseModel):
    question_id: str
    question_text: str
    category: str
    difficulty: str
    ideal_answer_outline: List[str]

class InterviewQuestionsResponse(BaseModel):
    job_title: str
    questions: List[InterviewQuestion]

# =============================================================================
# Monitoring Service Models
# =============================================================================

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    services: Dict[str, str]

# =============================================================================
# Languages Service Models
# =============================================================================

class Language(BaseModel):
    code: str
    name: str

class SupportedLanguagesResponse(BaseModel):
    languages: List[Language]
    total_count: int


class LanguageInfoResponse(BaseModel):
    code: str
    name: str
    supported: bool

# =============================================================================
# Feedback Service Models
# =============================================================================

class STARMethodAnalysis(BaseModel):
    situation: str
    task: str
    action: str
    result: str

class ResponseAnalysisResponse(BaseModel):
    overall_score: float
    content_score: float
    communication_score: float
    technical_score: float
    behavioral_score: float
    strengths: List[str]
    improvements: List[str]
    sentiment: str
    confidence_indicators: List[str]
    key_phrases: List[str]
    language: str


class InterviewFeedbackResponse(BaseModel):
    feedback_id: str
    overall_score: float
    category_scores: Dict[str, int]
    strengths: List[str]
    improvements: List[str]
    detailed_feedback: str
    next_steps: List[str]
    interview_readiness: str
    recommended_focus_areas: List[str]
    language: str


class ComprehensiveFeedbackResponse(BaseModel):
    report_id: str
    overall_score: float
    category_scores: Dict[str, int]
    strengths: List[str]
    improvements: List[str]
    detailed_feedback: str
    next_steps: List[str]
    interview_readiness: str
    recommended_focus_areas: List[str]
    language: str

# =============================================================================
# Monitoring Service Models
# =============================================================================


class HealthStatusResponse(BaseModel):
    status: str
    version: str
    uptime: float
    components: Dict[str, Dict[str, Any]]


class ServiceStatusResponse(BaseModel):
    service: str
    environment: str
    status: str
    timestamp: str
    metrics: Dict[str, Any]
    components: Dict[str, Dict[str, str]]


class TrackErrorResponse(BaseModel):
    error_id: str
    status: str

# =============================================================================
# Cache Service Models
# =============================================================================

class CacheStatisticsResponse(BaseModel):
    size: int
    hits: int
    misses: int
    hit_rate: float
    cache_types: Dict[str, int]


class CacheStatusResponse(BaseModel):
    status: str
    total_keys: int
    hits: int
    misses: int
    uptime: str

class CacheInvalidateResponse(BaseModel):
    invalidated_count: int
    message: str

# =============================================================================
# Auth Service Models
# =============================================================================

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    service: str
    roles: List[str]


class TokenRevokeResponse(BaseModel):
    status: str
    token_id: str


class AuthHealthCheckResponse(BaseModel):
    status: str
    service: str
    auth_enabled: bool

# =============================================================================
# Analysis Service Models
# =============================================================================

class JobAnalysisResponse(BaseModel):
    report_id: str
    job_title: str
    match_score: float = Field(..., ge=0, le=100)
    strengths: List[str]
    weaknesses: List[str]
    missing_keywords: List[str]
    recommended_skills: List[str]
    summary: str
