"""
Gamification routes for TRAVAIA User & Authentication Service
Handles XP, levels, streaks, achievements, and user progress tracking
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum

from services.gamification_service import GamificationService
from .auth import get_current_user

router = APIRouter()

# Enums
class AchievementType(str, Enum):
    INTERVIEW_MILESTONE = "interview_milestone"
    APPLICATION_MILESTONE = "application_milestone"
    STREAK_MILESTONE = "streak_milestone"
    PROFILE_COMPLETION = "profile_completion"
    SKILL_DEVELOPMENT = "skill_development"
    SOCIAL_ENGAGEMENT = "social_engagement"

class ActivityType(str, Enum):
    INTERVIEW_COMPLETED = "interview_completed"
    APPLICATION_ADDED = "application_added"
    PROFILE_UPDATED = "profile_updated"
    DOCUMENT_UPLOADED = "document_uploaded"
    SKILL_ASSESSED = "skill_assessed"
    DAILY_LOGIN = "daily_login"

# Pydantic models
class Achievement(BaseModel):
    id: str
    name: str
    description: str
    type: AchievementType
    icon: str
    xp_reward: int
    rarity: str  # common, rare, epic, legendary
    unlocked_at: Optional[datetime]
    progress: float  # 0.0 to 1.0
    requirements: Dict[str, Any]

class UserLevel(BaseModel):
    current_level: int
    current_xp: int
    xp_to_next_level: int
    total_xp: int
    level_name: str
    level_benefits: List[str]

class Streak(BaseModel):
    type: str
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    is_active: bool

class GamificationStats(BaseModel):
    user_id: str
    level: UserLevel
    achievements: List[Achievement]
    streaks: List[Streak]
    total_achievements: int
    completion_rate: float
    rank_percentile: float
    recent_activities: List[Dict[str, Any]]

class XPGain(BaseModel):
    activity_type: ActivityType
    xp_gained: int
    bonus_multiplier: float
    reason: str
    timestamp: datetime

@router.get("/stats", response_model=GamificationStats)
async def get_gamification_stats(current_user: str = Depends(get_current_user)):
    """Get comprehensive gamification statistics for user"""
    try:
        gamification_service = GamificationService()
        stats = await gamification_service.get_user_gamification_stats(current_user)
        
        return GamificationStats(**stats)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve gamification stats: {str(e)}"
        )

@router.get("/level", response_model=UserLevel)
async def get_user_level(current_user: str = Depends(get_current_user)):
    """Get user's current level and XP information"""
    try:
        gamification_service = GamificationService()
        level_info = await gamification_service.get_user_level(current_user)
        
        return UserLevel(**level_info)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user level: {str(e)}"
        )

@router.get("/achievements", response_model=List[Achievement])
async def get_user_achievements(current_user: str = Depends(get_current_user)):
    """Get all user achievements (unlocked and locked)"""
    try:
        gamification_service = GamificationService()
        achievements = await gamification_service.get_user_achievements(current_user)
        
        return [Achievement(**achievement) for achievement in achievements]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve achievements: {str(e)}"
        )

@router.get("/achievements/unlocked", response_model=List[Achievement])
async def get_unlocked_achievements(current_user: str = Depends(get_current_user)):
    """Get only unlocked achievements"""
    try:
        gamification_service = GamificationService()
        achievements = await gamification_service.get_unlocked_achievements(current_user)
        
        return [Achievement(**achievement) for achievement in achievements]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve unlocked achievements: {str(e)}"
        )

@router.get("/streaks", response_model=List[Streak])
async def get_user_streaks(current_user: str = Depends(get_current_user)):
    """Get all user streaks (login, interview, application, etc.)"""
    try:
        gamification_service = GamificationService()
        streaks = await gamification_service.get_user_streaks(current_user)
        
        return [Streak(**streak) for streak in streaks]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve streaks: {str(e)}"
        )

@router.post("/activity", response_model=XPGain)
async def record_activity(
    activity_type: ActivityType,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: str = Depends(get_current_user)
):
    """Record user activity and award XP"""
    try:
        gamification_service = GamificationService()
        xp_gain = await gamification_service.record_activity(
            user_id=current_user,
            activity_type=activity_type,
            metadata=metadata or {}
        )
        
        return XPGain(**xp_gain)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record activity: {str(e)}"
        )

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 10,
    timeframe: str = "all_time",  # all_time, monthly, weekly
    current_user: str = Depends(get_current_user)
):
    """Get leaderboard rankings"""
    try:
        gamification_service = GamificationService()
        leaderboard = await gamification_service.get_leaderboard(
            limit=limit,
            timeframe=timeframe,
            current_user_id=current_user
        )
        
        return {
            "leaderboard": leaderboard["rankings"],
            "current_user_rank": leaderboard["user_rank"],
            "total_users": leaderboard["total_users"],
            "timeframe": timeframe
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve leaderboard: {str(e)}"
        )

@router.get("/daily-challenge")
async def get_daily_challenge(current_user: str = Depends(get_current_user)):
    """Get today's daily challenge for the user"""
    try:
        gamification_service = GamificationService()
        challenge = await gamification_service.get_daily_challenge(current_user)
        
        return challenge
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve daily challenge: {str(e)}"
        )

@router.post("/daily-challenge/complete")
async def complete_daily_challenge(
    challenge_id: str,
    current_user: str = Depends(get_current_user)
):
    """Mark daily challenge as completed and award rewards"""
    try:
        gamification_service = GamificationService()
        result = await gamification_service.complete_daily_challenge(
            user_id=current_user,
            challenge_id=challenge_id
        )
        
        return {
            "message": "Daily challenge completed!",
            "xp_gained": result["xp_gained"],
            "bonus_rewards": result.get("bonus_rewards", []),
            "streak_bonus": result.get("streak_bonus", 0)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete daily challenge: {str(e)}"
        )

@router.get("/progress")
async def get_user_progress(current_user: str = Depends(get_current_user)):
    """Get detailed user progress across all gamification metrics"""
    try:
        gamification_service = GamificationService()
        progress = await gamification_service.get_comprehensive_progress(current_user)
        
        return {
            "level_progress": progress["level"],
            "achievement_progress": progress["achievements"],
            "streak_progress": progress["streaks"],
            "weekly_summary": progress["weekly_summary"],
            "monthly_summary": progress["monthly_summary"],
            "goals": progress["goals"],
            "recommendations": progress["recommendations"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user progress: {str(e)}"
        )

@router.post("/goals")
async def set_user_goals(
    goals: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Set or update user's gamification goals"""
    try:
        gamification_service = GamificationService()
        updated_goals = await gamification_service.set_user_goals(
            user_id=current_user,
            goals=goals
        )
        
        return {
            "message": "Goals updated successfully",
            "goals": updated_goals
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set goals: {str(e)}"
        )

@router.get("/badges")
async def get_available_badges(current_user: str = Depends(get_current_user)):
    """Get all available badges and user's progress toward them"""
    try:
        gamification_service = GamificationService()
        badges = await gamification_service.get_available_badges(current_user)
        
        return {
            "badges": badges,
            "total_available": len(badges),
            "earned_count": len([b for b in badges if b.get("earned", False)])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve badges: {str(e)}"
        )
