"""
Core domain models for Resume Synthesis Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Resume Generation Domain Models
# =============================================================================

class GeneratedResume(BaseModel):
    """Generated resume entity."""
    resume_id: str
    user_id: str
    template_id: str
    generation_status: str  # "pending", "processing", "completed", "failed"
    user_data: Dict[str, Any] = {}
    customizations: Dict[str, Any] = {}
    generated_content: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None
    download_url: Optional[str] = None
    format: str = "pdf"
    version: int = 1
    created_at: datetime
    updated_at: datetime

class ResumeTemplate(BaseModel):
    """Resume template definition."""
    template_id: str
    name: str
    description: Optional[str] = None
    template_data: Dict[str, Any] = {}
    category: str
    is_public: bool = False
    created_by: Optional[str] = None
    usage_count: int = 0
    rating: float = Field(0.0, ge=0.0, le=5.0)
    tags: List[str] = []
    preview_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class GenerationJob(BaseModel):
    """Resume generation job tracking."""
    job_id: str
    resume_id: str
    user_id: str
    job_type: str  # "generate", "regenerate", "export", "optimize"
    status: str  # "pending", "processing", "completed", "failed"
    progress: float = Field(0.0, ge=0.0, le=100.0)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

# =============================================================================
# Export Domain Models
# =============================================================================

class ResumeExport(BaseModel):
    """Resume export tracking."""
    export_id: str
    resume_id: str
    user_id: str
    export_format: str
    file_path: str
    download_url: str
    file_size: int
    export_status: str  # "pending", "processing", "completed", "failed"
    custom_styling: Dict[str, Any] = {}
    expires_at: Optional[datetime] = None
    created_at: datetime

class TemplateAsset(BaseModel):
    """Template assets (fonts, images, styles)."""
    asset_id: str
    template_id: str
    asset_type: str  # "font", "image", "style", "layout"
    asset_name: str
    file_path: str
    file_size: int
    is_required: bool = True
    created_at: datetime

# =============================================================================
# Optimization Domain Models
# =============================================================================

class ResumeOptimization(BaseModel):
    """Resume optimization results."""
    optimization_id: str
    resume_id: str
    optimization_type: str
    status: str  # "pending", "processing", "completed", "failed"
    original_content: Dict[str, Any] = {}
    optimized_content: Dict[str, Any] = {}
    optimization_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    improvements: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None

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

class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool