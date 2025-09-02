"""
Recording Routes - Interview recording management endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog
from services.recording_service import RecordingService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
recording_service = RecordingService()

# Pydantic models
class RecordingMetadata(BaseModel):
    session_id: str
    user_id: str
    duration_seconds: Optional[int] = None
    file_size_bytes: Optional[int] = None
    format: Optional[str] = "mp4"
    quality: Optional[str] = "720p"
    audio_only: Optional[bool] = False
    transcript_available: Optional[bool] = False

class RecordingProcessRequest(BaseModel):
    user_id: str
    processing_options: Optional[Dict[str, Any]] = {}

class RecordingShareRequest(BaseModel):
    user_id: str
    share_type: Optional[str] = "public"  # public, private, link_only
    expiry_hours: Optional[int] = 24

@router.post("/upload/{session_id}")
async def upload_recording(
    session_id: str,
    file: UploadFile = File(...),
    metadata: RecordingMetadata = None
):
    """Upload interview recording file"""
    try:
        # Validate file type
        if not file.content_type.startswith(('video/', 'audio/')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only video and audio files are allowed.")
        
        recording = await recording_service.upload_recording(
            session_id=session_id,
            file=file,
            metadata=metadata.dict() if metadata else {}
        )
        
        return {
            "success": True,
            "recording": recording,
            "message": "Recording uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recording upload failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{recording_id}")
async def get_recording(recording_id: str, user_id: str):
    """Get recording by ID"""
    try:
        recording = await recording_service.get_recording(recording_id, user_id)
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        
        return {
            "success": True,
            "recording": recording
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recording retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve recording")

@router.get("/session/{session_id}")
async def get_session_recordings(session_id: str, user_id: str):
    """Get all recordings for a session"""
    try:
        recordings = await recording_service.get_session_recordings(session_id, user_id)
        return {
            "success": True,
            "recordings": recordings,
            "count": len(recordings)
        }
    except Exception as e:
        logger.error("Session recordings retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve session recordings")

@router.get("/user/{user_id}")
async def get_user_recordings(user_id: str, limit: int = 50, offset: int = 0):
    """Get all recordings for a user"""
    try:
        recordings = await recording_service.get_user_recordings(user_id, limit, offset)
        return {
            "success": True,
            "recordings": recordings,
            "count": len(recordings)
        }
    except Exception as e:
        logger.error("User recordings retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve user recordings")

@router.post("/{recording_id}/process")
async def process_recording(recording_id: str, request: RecordingProcessRequest):
    """Process recording (transcription, analysis, etc.)"""
    try:
        result = await recording_service.process_recording(
            recording_id=recording_id,
            user_id=request.user_id,
            options=request.processing_options
        )
        
        return {
            "success": True,
            "processing_result": result,
            "message": "Recording processing started"
        }
    except Exception as e:
        logger.error("Recording processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{recording_id}/transcript")
async def get_transcript(recording_id: str, user_id: str):
    """Get recording transcript"""
    try:
        transcript = await recording_service.get_transcript(recording_id, user_id)
        if not transcript:
            raise HTTPException(status_code=404, detail="Transcript not available")
        
        return {
            "success": True,
            "transcript": transcript
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transcript retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve transcript")

@router.post("/{recording_id}/share")
async def create_share_link(recording_id: str, request: RecordingShareRequest):
    """Create shareable link for recording"""
    try:
        share_link = await recording_service.create_share_link(
            recording_id=recording_id,
            user_id=request.user_id,
            share_type=request.share_type,
            expiry_hours=request.expiry_hours
        )
        
        return {
            "success": True,
            "share_link": share_link,
            "message": "Share link created successfully"
        }
    except Exception as e:
        logger.error("Share link creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{recording_id}")
async def delete_recording(recording_id: str, user_id: str):
    """Delete recording"""
    try:
        success = await recording_service.delete_recording(recording_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Recording not found or unauthorized")
        
        return {
            "success": True,
            "message": "Recording deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recording deletion failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete recording")

@router.get("/{recording_id}/analytics")
async def get_recording_analytics(recording_id: str, user_id: str):
    """Get recording analytics and insights"""
    try:
        analytics = await recording_service.get_recording_analytics(recording_id, user_id)
        if not analytics:
            raise HTTPException(status_code=404, detail="Analytics not available")
        
        return {
            "success": True,
            "analytics": analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Recording analytics retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve recording analytics")