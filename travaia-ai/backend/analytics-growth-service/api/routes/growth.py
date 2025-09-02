"""
Growth Routes - Viral growth and referral endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import structlog
from services.growth_service import GrowthService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
growth_service = GrowthService()

# Pydantic models
class SocialShareRequest(BaseModel):
    user_id: str
    platform: str
    content_type: str
    content_id: str

@router.post("/referral-code")
async def create_referral_code(user_id: str):
    """Create referral code for user"""
    try:
        referral_data = await growth_service.create_referral_code(user_id)
        return {
            "success": True,
            "referral": referral_data,
            "message": "Referral code created successfully"
        }
    except Exception as e:
        logger.error("Referral code creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-referral")
async def process_referral(referral_code: str, new_user_id: str):
    """Process new user referral"""
    try:
        result = await growth_service.process_referral(referral_code, new_user_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Referral processing failed"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Referral processing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complete-referral")
async def complete_referral(referral_record_id: str):
    """Mark referral as completed and give rewards"""
    try:
        success = await growth_service.complete_referral(referral_record_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Referral record not found or already processed")
        
        return {
            "success": True,
            "message": "Referral completed and rewards given"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Referral completion failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral-stats/{user_id}")
async def get_referral_stats(user_id: str):
    """Get user's referral statistics"""
    try:
        stats = await growth_service.get_referral_stats(user_id)
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error("Referral stats retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-share")
async def track_social_share(request: SocialShareRequest):
    """Track social media sharing for viral growth"""
    try:
        success = await growth_service.track_social_share(
            request.user_id,
            request.platform,
            request.content_type,
            request.content_id
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to track social share")
        
        return {
            "success": True,
            "message": "Social share tracked successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Social share tracking failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/viral-coefficient")
async def get_viral_coefficient(days: int = 30):
    """Calculate platform viral coefficient"""
    try:
        coefficient = await growth_service.get_viral_coefficient(days)
        return {
            "success": True,
            "viral_metrics": coefficient
        }
    except Exception as e:
        logger.error("Viral coefficient calculation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))