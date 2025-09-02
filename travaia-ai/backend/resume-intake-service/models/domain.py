"""
Core domain models for Resume Intake Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Resume Domain Models
# =============================================================================

class Resume(BaseModel):
    """Core resume entity."""
    resume_id: str
    user_id: str
    file_name: str
    original_name: str
    content_type: str
    file_size: int
    storage_path: str
    download_url: Optional[str] = None
    source: str = "upload"
    status: str = "uploaded"  # "uploaded", "processing", "parsed", "failed"
    metadata: Dict[str, Any] = {}
    tags: List[str] = []
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class ResumeValidation(BaseModel):
    """Resume validation results."""
    validation_id: str
    resume_id: str
    validation_type: str
    status: str  # "pending", "completed", "failed"
    score: Optional[float] = Field(None, ge=0.0, le=100.0)
    issues: List[Dict[str, Any]] = []
    suggestions: List[str] = []
    ats_compatibility: Optional[float] = None
    validation_details: Dict[str, Any] = {}
    created_at: datetime
    completed_at: Optional[datetime] = None

class ResumeParseResult(BaseModel):
    """Parsed resume data."""
    parse_id: str
    resume_id: str
    status: str  # "pending", "completed", "failed"
    extracted_data: Dict[str, Any] = {}
    confidence_scores: Dict[str, float] = {}
    parsing_errors: List[str] = []
    raw_text: Optional[str] = None
    structured_data: Dict[str, Any] = {}
    created_at: datetime
    completed_at: Optional[datetime] = None

# =============================================================================
# Processing Domain Models
# =============================================================================

class ProcessingJob(BaseModel):
    """Resume processing job tracking."""
    job_id: str
    resume_id: str
    user_id: str
    job_type: str  # "upload", "parse", "validate", "convert"
    status: str  # "pending", "processing", "completed", "failed"
    progress: float = Field(0.0, ge=0.0, le=100.0)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

class FileUpload(BaseModel):
    """File upload tracking."""
    upload_id: str
    user_id: str
    file_name: str
    file_size: int
    content_type: str
    upload_status: str  # "pending", "uploading", "completed", "failed"
    storage_path: Optional[str] = None
    error_message: Optional[str] = None
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