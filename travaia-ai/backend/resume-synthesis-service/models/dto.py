"""
Data Transfer Objects (DTOs) for Resume Synthesis Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Resume Generation DTOs
# =============================================================================

class ResumeGenerateRequest(BaseModel):
    user_id: str
    template_id: str
    user_data: Dict[str, Any]
    target_job: Optional[str] = None
    customizations: Optional[Dict[str, Any]] = {}
    format: str = Field("pdf", pattern="^(pdf|docx|html|txt)$")

class TemplateCustomizeRequest(BaseModel):
    template_id: str
    customizations: Dict[str, Any]
    user_preferences: Optional[Dict[str, Any]] = {}

class BulkGenerateRequest(BaseModel):
    user_id: str
    generation_requests: List[ResumeGenerateRequest] = Field(..., max_items=5)

# =============================================================================
# Template Management DTOs
# =============================================================================

class TemplateCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    template_data: Dict[str, Any]
    category: str = Field(..., pattern="^(professional|creative|academic|technical|executive)$")
    is_public: bool = False
    tags: Optional[List[str]] = []

class TemplateUpdateRequest(BaseModel):
    template_id: str
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    template_data: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

# =============================================================================
# Export DTOs
# =============================================================================

class ResumeExportRequest(BaseModel):
    resume_id: str
    export_format: str = Field(..., pattern="^(pdf|docx|html|txt|json)$")
    include_metadata: bool = False
    custom_styling: Optional[Dict[str, Any]] = {}

class BatchExportRequest(BaseModel):
    resume_ids: List[str] = Field(..., max_items=10)
    export_format: str = "pdf"
    zip_output: bool = True

# =============================================================================
# Optimization DTOs
# =============================================================================

class ResumeOptimizeRequest(BaseModel):
    resume_id: str
    optimization_type: str = Field(..., pattern="^(ats|readability|keywords|length)$")
    target_job_description: Optional[str] = None
    constraints: Optional[Dict[str, Any]] = {}