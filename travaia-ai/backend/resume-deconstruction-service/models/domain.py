"""
Core domain models for Resume Deconstruction Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Analysis Domain Models
# =============================================================================

class ResumeAnalysis(BaseModel):
    """Comprehensive resume analysis results."""
    analysis_id: str
    resume_id: str
    user_id: str
    analysis_type: str
    status: str  # "pending", "processing", "completed", "failed"
    overall_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    analysis_results: Dict[str, Any] = {}
    recommendations: List[str] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

class SkillsAnalysis(BaseModel):
    """Skills extraction and analysis."""
    skills_analysis_id: str
    resume_id: str
    extracted_skills: Dict[str, List[str]] = {}  # {"technical": [...], "soft": [...]}
    skill_scores: Dict[str, float] = {}
    market_demand: Dict[str, str] = {}  # {"skill": "high/medium/low"}
    skill_gaps: List[str] = []
    skill_recommendations: List[str] = []
    confidence_scores: Dict[str, float] = {}
    created_at: datetime

class ContentAnalysis(BaseModel):
    """Content quality and structure analysis."""
    content_analysis_id: str
    resume_id: str
    grammar_score: float = Field(0.0, ge=0.0, le=100.0)
    readability_score: float = Field(0.0, ge=0.0, le=100.0)
    keyword_density: Dict[str, float] = {}
    structure_score: float = Field(0.0, ge=0.0, le=100.0)
    formatting_issues: List[str] = []
    content_suggestions: List[str] = []
    ats_compatibility: float = Field(0.0, ge=0.0, le=100.0)
    created_at: datetime

# =============================================================================
# Enhancement Domain Models
# =============================================================================

class ResumeEnhancement(BaseModel):
    """Resume enhancement suggestions and results."""
    enhancement_id: str
    resume_id: str
    enhancement_type: str
    status: str  # "pending", "processing", "completed", "failed"
    original_content: Dict[str, Any] = {}
    enhanced_content: Dict[str, Any] = {}
    improvements: List[Dict[str, Any]] = []
    enhancement_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    created_at: datetime
    completed_at: Optional[datetime] = None

class KeywordOptimization(BaseModel):
    """Keyword optimization analysis and suggestions."""
    optimization_id: str
    resume_id: str
    target_keywords: List[str] = []
    current_keywords: List[str] = []
    missing_keywords: List[str] = []
    keyword_suggestions: Dict[str, str] = {}  # {"keyword": "suggested_context"}
    optimization_score: float = Field(0.0, ge=0.0, le=100.0)
    created_at: datetime

# =============================================================================
# Feedback Domain Models
# =============================================================================

class ResumeFeedback(BaseModel):
    """Generated feedback and recommendations."""
    feedback_id: str
    analysis_id: str
    resume_id: str
    feedback_type: str
    feedback_content: Dict[str, Any] = {}
    actionable_items: List[str] = []
    priority_improvements: List[str] = []
    examples: List[Dict[str, str]] = []
    language: str = "en"
    created_at: datetime

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

class AnalysisJob(BaseModel):
    """Analysis job tracking."""
    job_id: str
    resume_id: str
    user_id: str
    job_type: str
    status: str
    progress: float = Field(0.0, ge=0.0, le=100.0)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime