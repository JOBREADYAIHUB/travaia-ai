"""
CareerGPT Coach Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    CoachingSessionRequest,
    ChatMessageRequest,
    SessionEndRequest,
    CareerAnalysisRequest,
    ResumeReviewRequest,
    InterviewPrepRequest,
    UserPreferencesRequest,
)

# Domain Models (Business Entities)
from .domain import (
    CoachingSession,
    ChatMessage,
    CoachingPlan,
    CareerAnalysis,
    SkillAssessment,
    MarketInsight,
    ApiResponse,
    UserPreferences,
)

__all__ = [
    # DTO Models
    "CoachingSessionRequest",
    "ChatMessageRequest",
    "SessionEndRequest",
    "CareerAnalysisRequest",
    "ResumeReviewRequest",
    "InterviewPrepRequest",
    "UserPreferencesRequest",
    # Domain Models
    "CoachingSession",
    "ChatMessage",
    "CoachingPlan",
    "CareerAnalysis",
    "SkillAssessment",
    "MarketInsight",
    "ApiResponse",
    "UserPreferences",
]