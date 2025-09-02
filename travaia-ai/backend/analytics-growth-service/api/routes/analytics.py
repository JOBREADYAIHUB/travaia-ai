"""
Analytics Routes - User and platform analytics endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import structlog
from services.analytics_service import AnalyticsService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
analytics_service = AnalyticsService()

# Pydantic models
class EventTrackingRequest(BaseModel):
    user_id: str
    event_type: str
    event_data: Optional[Dict[str, Any]] = {}
    session_id: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

@router.post("/track")
async def track_event(request: EventTrackingRequest):
    """Track user event for analytics"""
    try:
        success = await analytics_service.track_user_event(request.dict())
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to track event")
        
        return {
            "success": True,
            "message": "Event tracked successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Event tracking failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}")
async def get_user_analytics(user_id: str, days: int = 30):
    """Get user analytics for specified period"""
    try:
        analytics = await analytics_service.get_user_analytics(user_id, days)
        return {
            "success": True,
            "analytics": analytics
        }
    except Exception as e:
        logger.error("User analytics retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/platform/metrics")
async def get_platform_metrics(days: int = 7):
    """Get platform-wide metrics"""
    try:
        metrics = await analytics_service.get_platform_metrics(days)
        return {
            "success": True,
            "metrics": metrics
        }
    except Exception as e:
        logger.error("Platform metrics retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/features/usage")
async def get_feature_usage(feature_name: Optional[str] = None, days: int = 30):
    """Get feature usage analytics"""
    try:
        usage = await analytics_service.get_feature_usage(feature_name, days)
        return {
            "success": True,
            "usage": usage
        }
    except Exception as e:
        logger.error("Feature usage retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/insights")
async def get_user_insights(user_id: str):
    """Generate AI-powered user insights"""
    try:
        insights = await analytics_service.generate_user_insights(user_id)
        return {
            "success": True,
            "insights": insights
        }
    except Exception as e:
        logger.error("User insights generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))