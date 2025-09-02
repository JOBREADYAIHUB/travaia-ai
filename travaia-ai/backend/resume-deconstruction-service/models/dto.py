"""
Data Transfer Objects (DTOs) for Resume Deconstruction Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Analysis DTOs
# =============================================================================

class ResumeAnalysisRequest(BaseModel):
    resume_id: str
    analysis_type: str = Field("comprehensive", pattern="^(basic|comprehensive|skills_focused|ats_optimization)$")
    target_job: Optional[str] = None
    industry: Optional[str] = None
    language: str = "en"

class SkillsAnalysisRequest(BaseModel):
    resume_id: str
    skill_categories: List[str] = ["technical", "soft", "industry_specific"]
    market_comparison: bool = True
    skill_gap_analysis: bool = True

class ContentAnalysisRequest(BaseModel):
    resume_id: str
    analysis_focus: List[str] = ["grammar", "keywords", "formatting", "structure", "content_quality"]
    target_role: Optional[str] = None

# =============================================================================
# Enhancement DTOs
# =============================================================================

class ResumeEnhancementRequest(BaseModel):
    resume_id: str
    enhancement_type: str = Field(..., pattern="^(content|keywords|formatting|ats_optimization|skills_highlight)$")
    target_job_description: Optional[str] = None
    enhancement_level: str = Field("moderate", pattern="^(minimal|moderate|aggressive)$")

class KeywordOptimizationRequest(BaseModel):
    resume_id: str
    target_keywords: List[str] = []
    job_description: Optional[str] = None
    industry: Optional[str] = None
    optimization_strategy: str = Field("balanced", pattern="^(conservative|balanced|aggressive)$")

class BulkAnalysisRequest(BaseModel):
    resume_ids: List[str] = Field(..., max_items=10)
    analysis_type: str = "basic"
    comparison_mode: bool = False

# =============================================================================
# Feedback DTOs
# =============================================================================

class FeedbackGenerateRequest(BaseModel):
    analysis_id: str
    feedback_type: str = Field("comprehensive", pattern="^(basic|comprehensive|actionable)$")
    include_examples: bool = True
    language: str = "en"

class CustomFeedbackRequest(BaseModel):
    resume_id: str
    feedback_criteria: Dict[str, Any]
    target_audience: str = Field("general", pattern="^(general|technical|executive|entry_level)$")