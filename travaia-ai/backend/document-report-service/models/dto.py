"""
Data Transfer Objects (DTOs) for Document & Report Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Document Management DTOs
# =============================================================================

class DocumentUploadRequest(BaseModel):
    user_id: str
    document_type: str = Field(..., pattern="^(resume|cover_letter|portfolio|certificate|transcript)$")
    file_name: str = Field(..., min_length=1, max_length=255)
    file_size: int = Field(..., gt=0, le=10485760)  # 10MB limit
    content_type: str = Field(..., pattern="^(application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document|image/jpeg|image/png)$")
    tags: Optional[List[str]] = []

class DocumentUpdateRequest(BaseModel):
    document_id: str
    file_name: Optional[str] = Field(None, min_length=1, max_length=255)
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None

class DocumentSearchRequest(BaseModel):
    user_id: str
    document_type: Optional[str] = None
    tags: Optional[List[str]] = None
    search_query: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# =============================================================================
# AI Report DTOs
# =============================================================================

class ReportGenerateRequest(BaseModel):
    user_id: str
    report_type: str = Field(..., pattern="^(job_match|interview_feedback|skill_analysis|career_roadmap|resume_analysis)$")
    source_data: Dict[str, Any]
    template_id: Optional[str] = None
    format: str = Field("pdf", pattern="^(pdf|html|json)$")
    language: str = "en"

class ReportUpdateRequest(BaseModel):
    report_id: str
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class BulkReportRequest(BaseModel):
    user_id: str
    report_requests: List[ReportGenerateRequest] = Field(..., max_items=10)

# =============================================================================
# Template Management DTOs
# =============================================================================

class TemplateCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    template_type: str = Field(..., pattern="^(resume|cover_letter|report|certificate)$")
    content: Dict[str, Any]
    is_public: bool = False
    tags: Optional[List[str]] = []

class TemplateUpdateRequest(BaseModel):
    template_id: str
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

# =============================================================================
# Export DTOs
# =============================================================================

class DocumentExportRequest(BaseModel):
    document_ids: List[str] = Field(..., max_items=50)
    export_format: str = Field("zip", pattern="^(zip|pdf|docx)$")
    include_metadata: bool = True