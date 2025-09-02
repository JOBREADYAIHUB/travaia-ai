"""
Session Routes - Interview session management endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
import structlog

from services.session_service import SessionService
from models.dto import (
    SessionCreateRequest,
    SessionStartRequest,
    SessionEndRequest,
)
from models.domain import (
    InterviewSession,
    SessionResponse,
    SessionListResponse,
    GenericSuccessResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
session_service = SessionService()

@router.post("/", response_model=SessionResponse)
async def create_session(request: SessionCreateRequest):
    """Create new interview session"""
    try:
        session_data = await session_service.create_session(request.dict())
        return SessionResponse(
            success=True,
            session=InterviewSession(**session_data),
            message="Interview session created successfully",
        )
    except Exception as e:
        logger.error("Session creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/start", response_model=SessionResponse)
async def start_session(session_id: str, request: SessionStartRequest):
    """Start interview session"""
    try:
        session_data = await session_service.start_session(session_id, request.user_id)
        return SessionResponse(
            success=True,
            session=InterviewSession(**session_data),
            message="Interview session started successfully",
        )
    except Exception as e:
        logger.error("Session start failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/end", response_model=GenericSuccessResponse)
async def end_session(session_id: str, request: SessionEndRequest):
    """End interview session"""
    try:
        session_results = {
            "feedback": request.feedback,
            "analytics": request.analytics,
            "recording_url": request.recording_url,
            "scores": request.scores,
            "responses": request.responses,
        }

        success = await session_service.end_session(
            session_id, request.user_id, session_results
        )

        if not success:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")

        return GenericSuccessResponse(
            success=True, message="Interview session ended successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Session end failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user_id: str):
    """Get session by ID"""
    try:
        session_data = await session_service.get_session(session_id, user_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")

        return SessionResponse(success=True, session=InterviewSession(**session_data))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Session retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve session")


@router.get("/user/{user_id}", response_model=SessionListResponse)
async def get_user_sessions(user_id: str, limit: int = 50):
    """Get all sessions for a user"""
    try:
        sessions_data = await session_service.get_user_sessions(user_id, limit)
        sessions = [InterviewSession(**s) for s in sessions_data]
        return SessionListResponse(success=True, sessions=sessions, count=len(sessions))
    except Exception as e:
        logger.error("User sessions retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")