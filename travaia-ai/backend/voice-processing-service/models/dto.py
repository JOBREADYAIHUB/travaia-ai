"""
Data Transfer Objects (DTOs) for Voice Processing Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Speech Processing DTOs
# =============================================================================

class SpeechToTextRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    audio_format: str = Field("webm", pattern="^(wav|mp3|webm|ogg|m4a)$")
    language_code: str = "en-US"
    sample_rate: Optional[int] = 16000
    enable_punctuation: bool = True
    enable_speaker_diarization: bool = False

class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    language_code: str = "en-US"
    voice_name: Optional[str] = None
    speaking_rate: float = Field(1.0, ge=0.25, le=4.0)
    pitch: float = Field(0.0, ge=-20.0, le=20.0)
    volume_gain_db: float = Field(0.0, ge=-96.0, le=16.0)
    audio_format: str = Field("mp3", pattern="^(mp3|wav|ogg)$")

class BatchProcessingRequest(BaseModel):
    requests: List[Dict[str, Any]] = Field(..., max_items=50)
    processing_type: str = Field(..., pattern="^(stt|tts|enhancement|analysis)$")
    priority: str = Field("normal", pattern="^(low|normal|high)$")

# =============================================================================
# Audio Enhancement DTOs
# =============================================================================

class AudioEnhancementRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    enhancement_type: str = Field(..., pattern="^(noise_reduction|volume_normalization|clarity_boost|echo_removal)$")
    intensity: float = Field(0.5, ge=0.0, le=1.0)
    preserve_original: bool = True

class VoiceAnalysisRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    analysis_type: List[str] = ["emotion", "confidence", "pace", "clarity"]
    language_code: str = "en-US"

# =============================================================================
# Real-time Processing DTOs
# =============================================================================

class StreamingSessionRequest(BaseModel):
    session_type: str = Field(..., pattern="^(stt|tts|bidirectional)$")
    language_code: str = "en-US"
    audio_config: Dict[str, Any] = {}
    processing_options: Dict[str, Any] = {}

class StreamingDataRequest(BaseModel):
    session_id: str
    audio_chunk: str  # Base64 encoded audio chunk
    is_final: bool = False
    sequence_number: int = 0

# =============================================================================
# Configuration DTOs
# =============================================================================

class VoiceConfigRequest(BaseModel):
    user_id: str
    preferred_voice: str
    language_preferences: List[str] = ["en-US"]
    speech_rate: float = Field(1.0, ge=0.25, le=4.0)
    audio_quality: str = Field("standard", pattern="^(low|standard|high|premium)$")