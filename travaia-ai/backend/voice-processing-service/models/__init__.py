"""
Voice Processing Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    SpeechToTextRequest,
    TextToSpeechRequest,
    BatchProcessingRequest,
    AudioEnhancementRequest,
    VoiceAnalysisRequest,
    StreamingSessionRequest,
    StreamingDataRequest,
    VoiceConfigRequest,
)

# Domain Models (Business Entities)
from .domain import (
    AudioProcessingJob,
    SpeechToTextResult,
    TextToSpeechResult,
    AudioEnhancement,
    VoiceAnalysis,
    StreamingSession,
    StreamingResult,
    UserVoiceConfig,
    ApiResponse,
    ProcessingMetrics,
)

__all__ = [
    # DTO Models
    "SpeechToTextRequest",
    "TextToSpeechRequest",
    "BatchProcessingRequest",
    "AudioEnhancementRequest",
    "VoiceAnalysisRequest",
    "StreamingSessionRequest",
    "StreamingDataRequest",
    "VoiceConfigRequest",
    # Domain Models
    "AudioProcessingJob",
    "SpeechToTextResult",
    "TextToSpeechResult",
    "AudioEnhancement",
    "VoiceAnalysis",
    "StreamingSession",
    "StreamingResult",
    "UserVoiceConfig",
    "ApiResponse",
    "ProcessingMetrics",
]