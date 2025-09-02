"""
Data Transfer Objects (DTOs) for WebRTC Media Server.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Room Management DTOs
# =============================================================================

class RoomCreateRequest(BaseModel):
    room_name: str = Field(..., min_length=1, max_length=200)
    max_participants: int = Field(10, ge=1, le=100)
    room_type: str = Field("interview", pattern="^(interview|meeting|webinar|presentation)$")
    is_recording_enabled: bool = True
    auto_end_minutes: Optional[int] = Field(None, ge=5, le=480)  # 5 minutes to 8 hours
    metadata: Optional[Dict[str, Any]] = {}

class RoomJoinRequest(BaseModel):
    room_id: str
    participant_name: str = Field(..., min_length=1, max_length=100)
    participant_type: str = Field("participant", pattern="^(host|participant|observer)$")
    audio_enabled: bool = True
    video_enabled: bool = True

class RoomUpdateRequest(BaseModel):
    room_id: str
    room_name: Optional[str] = Field(None, min_length=1, max_length=200)
    max_participants: Optional[int] = Field(None, ge=1, le=100)
    is_recording_enabled: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

# =============================================================================
# Participant Management DTOs
# =============================================================================

class ParticipantUpdateRequest(BaseModel):
    participant_id: str
    audio_enabled: Optional[bool] = None
    video_enabled: Optional[bool] = None
    screen_share_enabled: Optional[bool] = None
    participant_name: Optional[str] = Field(None, min_length=1, max_length=100)

class ParticipantKickRequest(BaseModel):
    room_id: str
    participant_id: str
    reason: Optional[str] = Field(None, max_length=500)

# =============================================================================
# Recording DTOs
# =============================================================================

class RecordingStartRequest(BaseModel):
    room_id: str
    recording_type: str = Field("audio_video", pattern="^(audio_only|video_only|audio_video|screen_only)$")
    quality: str = Field("standard", pattern="^(low|standard|high|ultra)$")
    auto_stop_minutes: Optional[int] = Field(None, ge=1, le=480)

class RecordingStopRequest(BaseModel):
    room_id: str
    recording_id: str

class RecordingExportRequest(BaseModel):
    recording_id: str
    export_format: str = Field("mp4", pattern="^(mp4|webm|mp3|wav)$")
    include_metadata: bool = True

# =============================================================================
# Media Configuration DTOs
# =============================================================================

class MediaConfigRequest(BaseModel):
    room_id: str
    audio_config: Optional[Dict[str, Any]] = {
        "codec": "opus",
        "bitrate": 64000,
        "sample_rate": 48000
    }
    video_config: Optional[Dict[str, Any]] = {
        "codec": "vp8",
        "resolution": "720p",
        "framerate": 30,
        "bitrate": 1000000
    }

class StreamingConfigRequest(BaseModel):
    room_id: str
    streaming_enabled: bool = True
    streaming_url: Optional[str] = None
    streaming_key: Optional[str] = None
    streaming_quality: str = Field("standard", pattern="^(low|standard|high)$")