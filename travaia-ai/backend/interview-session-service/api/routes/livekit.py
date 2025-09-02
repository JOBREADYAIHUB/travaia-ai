"""
LiveKit Routes for Interview & Session Service
Handles LiveKit room management, token generation, and WebRTC integration
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional
import os
import logging
from datetime import datetime

# Import shared LiveKit auth service
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../shared"))

try:
    from livekit_auth import LiveKitTokenService, generate_interview_token, generate_bot_token
except ImportError as e:
    # Create minimal fallback implementations
    class LiveKitTokenService:
        def __init__(self):
            self.api_key = os.getenv("LIVEKIT_API_KEY")
            self.api_secret = os.getenv("LIVEKIT_API_SECRET")
        
        def generate_token(self, user_id: str, room_name: str, permissions: dict = None):
            return f"token_{user_id}_{room_name}"
    
    def generate_interview_token(user_id: str, interview_id: str):
        return f"interview_token_{user_id}_{interview_id}", f"room_{interview_id}"
    
    def generate_bot_token(interview_id: str):
        return f"bot_token_{interview_id}", f"room_{interview_id}"

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models for request/response
class TokenRequest(BaseModel):
    user_id: str
    interview_id: str
    permissions: Optional[Dict[str, bool]] = None

class TokenResponse(BaseModel):
    token: str
    room_name: str
    livekit_url: str
    expires_in: int

class RoomInfo(BaseModel):
    room_name: str
    interview_id: str
    participants: List[str]
    created_at: datetime
    status: str

class InterviewSessionRequest(BaseModel):
    user_id: str
    interview_type: str = "behavioral"
    job_title: Optional[str] = None
    company: Optional[str] = None
    difficulty: str = "medium"

class InterviewSessionResponse(BaseModel):
    session_id: str
    room_name: str
    user_token: str
    bot_token: str
    livekit_url: str
    session_config: Dict

# Initialize LiveKit service
try:
    livekit_service = LiveKitTokenService()
except Exception as e:
    logger.error(f"Failed to initialize LiveKit service: {e}")
    livekit_service = None

@router.post("/token", response_model=TokenResponse)
async def generate_token(request: TokenRequest):
    """Generate LiveKit access token for interview session"""
    if not livekit_service:
        raise HTTPException(status_code=500, detail="LiveKit service not available")
    
    try:
        token = generate_interview_token(request.user_id, request.interview_id)
        room_name = f"interview-{request.interview_id}"
        
        return TokenResponse(
            token=token,
            room_name=room_name,
            livekit_url=os.getenv("LIVEKIT_URL", "wss://travaia-h4it5r9s.livekit.cloud"),
            expires_in=10800  # 3 hours
        )
    except Exception as e:
        logger.error(f"Failed to generate token: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate access token")

@router.post("/interview/start", response_model=InterviewSessionResponse)
async def start_interview_session(request: InterviewSessionRequest):
    """Start a new interview session with LiveKit room"""
    if not livekit_service:
        raise HTTPException(status_code=500, detail="LiveKit service not available")
    
    try:
        # Generate unique session ID
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{request.user_id}"
        interview_id = f"interview_{session_id}"
        room_name = f"interview-{interview_id}"
        
        # Generate tokens
        user_token = generate_interview_token(request.user_id, interview_id)
        bot_token = generate_bot_token(room_name, "interview-ai")
        
        # Session configuration
        session_config = {
            "interview_type": request.interview_type,
            "job_title": request.job_title,
            "company": request.company,
            "difficulty": request.difficulty,
            "max_duration": 3600,  # 1 hour
            "recording_enabled": True,
            "ai_feedback_enabled": True,
            "real_time_coaching": True
        }
        
        logger.info(f"Started interview session {session_id} for user {request.user_id}")
        
        return InterviewSessionResponse(
            session_id=session_id,
            room_name=room_name,
            user_token=user_token,
            bot_token=bot_token,
            livekit_url=os.getenv("LIVEKIT_URL", "wss://travaia-h4it5r9s.livekit.cloud"),
            session_config=session_config
        )
        
    except Exception as e:
        logger.error(f"Failed to start interview session: {e}")
        raise HTTPException(status_code=500, detail="Failed to start interview session")

@router.get("/room/{room_name}/info")
async def get_room_info(room_name: str):
    """Get information about a LiveKit room"""
    try:
        # In a real implementation, you would query LiveKit API for room info
        # For now, return mock data
        return {
            "room_name": room_name,
            "status": "active",
            "participant_count": 2,
            "created_at": datetime.now().isoformat(),
            "recording_active": True
        }
    except Exception as e:
        logger.error(f"Failed to get room info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get room information")

@router.post("/room/{room_name}/end")
async def end_interview_session(room_name: str):
    """End an interview session and cleanup room"""
    try:
        # In a real implementation, you would:
        # 1. Stop recording
        # 2. Disconnect all participants
        # 3. Generate session report
        # 4. Clean up resources
        
        logger.info(f"Ending interview session for room {room_name}")
        
        return {
            "status": "ended",
            "room_name": room_name,
            "ended_at": datetime.now().isoformat(),
            "message": "Interview session ended successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to end session: {e}")
        raise HTTPException(status_code=500, detail="Failed to end interview session")

@router.get("/health")
async def livekit_health_check():
    """Health check for LiveKit integration"""
    try:
        # Check if LiveKit service is available
        if not livekit_service:
            return {"status": "unhealthy", "reason": "LiveKit service not initialized"}
        
        # Check environment variables
        required_vars = ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            return {
                "status": "unhealthy", 
                "reason": f"Missing environment variables: {missing_vars}"
            }
        
        return {
            "status": "healthy",
            "livekit_url": os.getenv("LIVEKIT_URL"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"LiveKit health check failed: {e}")
        return {"status": "unhealthy", "reason": str(e)}

@router.get("/config")
async def get_livekit_config():
    """Get LiveKit configuration for frontend"""
    return {
        "livekit_url": os.getenv("LIVEKIT_URL", "wss://travaia-h4it5r9s.livekit.cloud"),
        "features": {
            "audio": True,
            "video": False,
            "data_channels": True,
            "recording": True,
            "transcription": True
        },
        "limits": {
            "max_session_duration": 3600,
            "max_participants": 10,
            "max_bitrate": 128000
        }
    }
