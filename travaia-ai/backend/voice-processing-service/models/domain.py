"""
Core domain models for Voice Processing Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Processing Domain Models
# =============================================================================

class AudioProcessingJob(BaseModel):
    """Audio processing job tracking."""
    job_id: str
    user_id: Optional[str] = None
    job_type: str  # "stt", "tts", "enhancement", "analysis"
    status: str  # "pending", "processing", "completed", "failed"
    input_data: Dict[str, Any] = {}
    output_data: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class SpeechToTextResult(BaseModel):
    """Speech-to-text processing result."""
    result_id: str
    job_id: str
    transcript: str
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    word_timestamps: List[Dict[str, Any]] = []
    speaker_labels: Optional[List[str]] = None
    language_detected: Optional[str] = None
    processing_duration: float
    created_at: datetime

class TextToSpeechResult(BaseModel):
    """Text-to-speech processing result."""
    result_id: str
    job_id: str
    audio_data: str  # Base64 encoded audio
    audio_format: str
    duration_seconds: float
    file_size: int
    voice_used: str
    processing_duration: float
    created_at: datetime

# =============================================================================
# Enhancement Domain Models
# =============================================================================

class AudioEnhancement(BaseModel):
    """Audio enhancement processing result."""
    enhancement_id: str
    job_id: str
    enhancement_type: str
    original_audio: str
    enhanced_audio: str
    improvement_metrics: Dict[str, float] = {}
    processing_parameters: Dict[str, Any] = {}
    created_at: datetime

class VoiceAnalysis(BaseModel):
    """Voice analysis results."""
    analysis_id: str
    job_id: str
    emotion_scores: Dict[str, float] = {}
    confidence_level: float = Field(0.0, ge=0.0, le=1.0)
    speech_pace: float  # words per minute
    clarity_score: float = Field(0.0, ge=0.0, le=1.0)
    volume_levels: Dict[str, float] = {}
    background_noise_level: float = Field(0.0, ge=0.0, le=1.0)
    created_at: datetime

# =============================================================================
# Streaming Domain Models
# =============================================================================

class StreamingSession(BaseModel):
    """Real-time streaming session."""
    session_id: str
    user_id: Optional[str] = None
    session_type: str
    status: str  # "active", "paused", "completed", "failed"
    language_code: str
    audio_config: Dict[str, Any] = {}
    processing_options: Dict[str, Any] = {}
    start_time: datetime
    end_time: Optional[datetime] = None
    total_duration: Optional[float] = None
    created_at: datetime

class StreamingResult(BaseModel):
    """Streaming processing result."""
    result_id: str
    session_id: str
    sequence_number: int
    result_data: Dict[str, Any] = {}
    is_final: bool = False
    confidence: Optional[float] = None
    timestamp: datetime

# =============================================================================
# Configuration Domain Models
# =============================================================================

class UserVoiceConfig(BaseModel):
    """User voice processing preferences."""
    config_id: str
    user_id: str
    preferred_voice: str
    language_preferences: List[str] = []
    speech_rate: float = 1.0
    audio_quality: str = "standard"
    custom_settings: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

# =============================================================================
# Common Response Models
# =============================================================================

class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class ProcessingMetrics(BaseModel):
    """Processing performance metrics."""
    total_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    average_processing_time: float = 0.0
    success_rate: float = 0.0
    last_updated: datetime