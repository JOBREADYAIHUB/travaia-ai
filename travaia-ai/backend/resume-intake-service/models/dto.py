"""
Data Transfer Objects (DTOs) for Resume Intake Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Resume Upload DTOs
# =============================================================================

class ResumeUploadRequest(BaseModel):
    user_id: str
    file_name: str = Field(..., min_length=1, max_length=255)
    file_content: str  # Base64 encoded file content
    content_type: str = Field(..., pattern="^(application/pdf|application/msword|application/vnd.openxmlformats-officedocument.wordprocessingml.document|text/plain)$")
    file_size: int = Field(..., gt=0, le=5242880)  # 5MB limit
    source: str = Field("upload", pattern="^(upload|url|template)$")

class ResumeUrlRequest(BaseModel):
    user_id: str
    resume_url: str = Field(..., min_length=1, max_length=1000)
    file_name: Optional[str] = None

class ResumeTextRequest(BaseModel):
    user_id: str
    resume_text: str = Field(..., min_length=100, max_length=50000)
    file_name: str = Field(..., min_length=1, max_length=255)

# =============================================================================
# Validation DTOs
# =============================================================================

class ResumeValidationRequest(BaseModel):
    resume_id: str
    validation_type: str = Field("comprehensive", pattern="^(basic|comprehensive|ats_check)$")
    target_job: Optional[str] = None
    industry: Optional[str] = None

class BulkValidationRequest(BaseModel):
    resume_ids: List[str] = Field(..., max_items=20)
    validation_type: str = "basic"

# =============================================================================
# Processing DTOs
# =============================================================================

class ResumeParseRequest(BaseModel):
    resume_id: str
    parse_options: Dict[str, bool] = {
        "extract_contact": True,
        "extract_skills": True,
        "extract_experience": True,
        "extract_education": True,
        "extract_certifications": True
    }

class ResumeUpdateRequest(BaseModel):
    resume_id: str
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None