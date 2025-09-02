"""
Core domain models for WebRTC Media Server.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Room Domain Models
# =============================================================================

class Room(BaseModel):
    """WebRTC room entity."""
    room_id: str
    room_name: str
    room_type: str
    status: str  # "active", "inactive", "ended"
    max_participants: int
    current_participants: int = 0
    host_id: Optional[str] = None
    is_recording_enabled: bool = True
    auto_end_minutes: Optional[int] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

class Participant(BaseModel):
    """Room participant entity."""
    participant_id: str
    room_id: str
    participant_name: str
    participant_type: str
    connection_status: str  # "connecting", "connected", "disconnected", "failed"
    audio_enabled: bool = True
    video_enabled: bool = True
    screen_share_enabled: bool = False
    join_time: datetime
    leave_time: Optional[datetime] = None
    connection_quality: Optional[str] = None  # "poor", "fair", "good", "excellent"
    metadata: Dict[str, Any] = {}

# =============================================================================
# Recording Domain Models
# =============================================================================

class Recording(BaseModel):
    """Room recording entity."""
    recording_id: str
    room_id: str
    recording_type: str
    status: str  # "recording", "stopped", "processing", "completed", "failed"
    quality: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    duration_seconds: Optional[float] = None
    download_url: Optional[str] = None
    started_at: datetime
    stopped_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None

class RecordingExport(BaseModel):
    """Recording export job."""
    export_id: str
    recording_id: str
    export_format: str
    status: str  # "pending", "processing", "completed", "failed"
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    include_metadata: bool = True
    created_at: datetime
    completed_at: Optional[datetime] = None

# =============================================================================
# Media Configuration Domain Models
# =============================================================================

class MediaConfiguration(BaseModel):
    """Room media configuration."""
    config_id: str
    room_id: str
    audio_config: Dict[str, Any] = {}
    video_config: Dict[str, Any] = {}
    recording_config: Dict[str, Any] = {}
    streaming_config: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class ConnectionStats(BaseModel):
    """Participant connection statistics."""
    stats_id: str
    participant_id: str
    room_id: str
    bandwidth_up: float = 0.0  # kbps
    bandwidth_down: float = 0.0  # kbps
    packet_loss: float = 0.0  # percentage
    latency: float = 0.0  # milliseconds
    jitter: float = 0.0  # milliseconds
    audio_quality_score: Optional[float] = None
    video_quality_score: Optional[float] = None
    timestamp: datetime

# =============================================================================
# Server Management Domain Models
# =============================================================================

class MediaServer(BaseModel):
    """Media server instance."""
    server_id: str
    server_name: str
    server_type: str  # "livekit", "coturn", "janus"
    status: str  # "active", "inactive", "maintenance", "failed"
    host: str
    port: int
    capacity: int
    current_load: int = 0
    region: str
    health_score: float = Field(100.0, ge=0.0, le=100.0)
    last_health_check: datetime
    created_at: datetime

class ServerMetrics(BaseModel):
    """Server performance metrics."""
    metrics_id: str
    server_id: str
    cpu_usage: float = Field(0.0, ge=0.0, le=100.0)
    memory_usage: float = Field(0.0, ge=0.0, le=100.0)
    network_in: float = 0.0  # Mbps
    network_out: float = 0.0  # Mbps
    active_rooms: int = 0
    active_participants: int = 0
    total_bandwidth: float = 0.0  # Mbps
    timestamp: datetime

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

class RoomToken(BaseModel):
    """Room access token."""
    token: str
    room_id: str
    participant_id: str
    expires_at: datetime
    permissions: List[str] = []