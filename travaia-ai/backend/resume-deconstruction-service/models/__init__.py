"""
Resume Deconstruction Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    ResumeAnalysisRequest,
    SkillsAnalysisRequest,
    ContentAnalysisRequest,
    ResumeEnhancementRequest,
    KeywordOptimizationRequest,
    BulkAnalysisRequest,
    FeedbackGenerateRequest,
    CustomFeedbackRequest,
)

# Domain Models (Business Entities)
from .domain import (
    ResumeAnalysis,
    SkillsAnalysis,
    ContentAnalysis,
    ResumeEnhancement,
    KeywordOptimization,
    ResumeFeedback,
    ApiResponse,
    AnalysisJob,
)

__all__ = [
    # DTO Models
    "ResumeAnalysisRequest",
    "SkillsAnalysisRequest",
    "ContentAnalysisRequest",
    "ResumeEnhancementRequest",
    "KeywordOptimizationRequest",
    "BulkAnalysisRequest",
    "FeedbackGenerateRequest",
    "CustomFeedbackRequest",
    # Domain Models
    "ResumeAnalysis",
    "SkillsAnalysis",
    "ContentAnalysis",
    "ResumeEnhancement",
    "KeywordOptimization",
    "ResumeFeedback",
    "ApiResponse",
    "AnalysisJob",
]