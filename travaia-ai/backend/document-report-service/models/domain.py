"""
Core domain models for Document & Report Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Document Domain Models
# =============================================================================

class Document(BaseModel):
    """User document storage and metadata."""
    document_id: str
    user_id: str
    file_name: str
    original_name: str
    document_type: str
    file_size: int
    content_type: str
    storage_path: str
    download_url: Optional[str] = None
    is_public: bool = False
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class DocumentVersion(BaseModel):
    """Document version history."""
    version_id: str
    document_id: str
    version_number: int
    file_name: str
    file_size: int
    storage_path: str
    changes_summary: Optional[str] = None
    created_at: datetime

# =============================================================================
# AI Report Domain Models
# =============================================================================

class AIReport(BaseModel):
    """AI-generated reports and analyses."""
    report_id: str
    user_id: str
    report_type: str
    title: str
    content: Dict[str, Any]
    source_data: Dict[str, Any]
    template_id: Optional[str] = None
    format: str = "pdf"
    language: str = "en"
    file_path: Optional[str] = None
    download_url: Optional[str] = None
    is_public: bool = False
    tags: List[str] = []
    generation_status: str = "completed"  # "pending", "processing", "completed", "failed"
    created_at: datetime
    updated_at: datetime

class ReportTemplate(BaseModel):
    """Report and document templates."""
    template_id: str
    name: str
    template_type: str
    content: Dict[str, Any]
    variables: List[str] = []
    is_public: bool = False
    created_by: Optional[str] = None
    tags: List[str] = []
    usage_count: int = 0
    created_at: datetime
    updated_at: datetime

# =============================================================================
# Processing Domain Models
# =============================================================================

class DocumentProcessingJob(BaseModel):
    """Document processing and analysis jobs."""
    job_id: str
    document_id: str
    user_id: str
    job_type: str  # "ocr", "analysis", "conversion", "validation"
    status: str  # "pending", "processing", "completed", "failed"
    progress: float = Field(0.0, ge=0.0, le=100.0)
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

class FileStorage(BaseModel):
    """File storage metadata and management."""
    storage_id: str
    file_path: str
    bucket_name: str
    file_size: int
    content_type: str
    checksum: str
    encryption_key: Optional[str] = None
    access_level: str = "private"  # "private", "public", "shared"
    expiry_date: Optional[datetime] = None
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

class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool