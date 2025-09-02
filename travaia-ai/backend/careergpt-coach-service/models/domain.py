"""
Core domain models for CareerGPT Coach Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Coaching Domain Models
# =============================================================================

class CoachingSession(BaseModel):
    """A coaching session between user and CareerGPT."""
    session_id: str
    user_id: str
    session_type: str
    status: str  # "active", "completed", "cancelled"
    context: Dict[str, Any] = {}
    language: str = "en"
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class ChatMessage(BaseModel):
    """Individual message in a coaching session."""
    message_id: str
    session_id: str
    sender: str  # "user" or "coach"
    message: str
    message_type: str = "text"
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = {}

class CoachingPlan(BaseModel):
    """Personalized coaching plan for a user."""
    plan_id: str
    user_id: str
    plan_type: str  # "career_development", "interview_prep", "skill_building"
    goals: List[str] = []
    milestones: List[Dict[str, Any]] = []
    recommended_actions: List[str] = []
    progress_metrics: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

# =============================================================================
# Analysis Domain Models
# =============================================================================

class CareerAnalysis(BaseModel):
    """Career analysis results."""
    analysis_id: str
    user_id: str
    analysis_type: str
    input_data: Dict[str, Any]
    results: Dict[str, Any]
    recommendations: List[str] = []
    confidence_score: float = Field(0.0, ge=0.0, le=1.0)
    created_at: datetime

class SkillAssessment(BaseModel):
    """User skill assessment."""
    assessment_id: str
    user_id: str
    skills_evaluated: List[str]
    skill_scores: Dict[str, float] = {}
    skill_gaps: List[str] = []
    improvement_suggestions: List[str] = []
    market_demand: Dict[str, float] = {}
    created_at: datetime

class MarketInsight(BaseModel):
    """Job market insights and trends."""
    insight_id: str
    industry: str
    role: str
    salary_range: Dict[str, int] = {}  # {"min": 80000, "max": 120000}
    demand_level: str  # "low", "medium", "high"
    growth_projection: str  # "declining", "stable", "growing"
    required_skills: List[str] = []
    emerging_skills: List[str] = []
    data_source: str
    last_updated: datetime

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

class UserPreferences(BaseModel):
    """User coaching preferences."""
    user_id: str
    coaching_style: str = "supportive"
    communication_frequency: str = "weekly"
    focus_areas: List[str] = []
    goals: List[str] = []
    updated_at: datetime