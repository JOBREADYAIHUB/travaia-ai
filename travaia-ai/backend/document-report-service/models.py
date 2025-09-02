"""
Pydantic models for TRAVAIA Document & Report Service
Defines request/response models for documents, reports, and API responses
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# Pagination Models
class PaginationParams(BaseModel):
    """Query parameters for pagination"""
    page: int = Field(default=1, ge=1, description="Page number (starts from 1)")
    limit: int = Field(default=10, ge=1, le=100, description="Number of items per page (max 100)")

class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

# AI Report Content Model
class AIReportContent(BaseModel):
    """AI report content structure"""
    score: Optional[float] = Field(None, ge=0, le=100, description="Report score (0-100)")
    strengths: List[str] = Field(default_factory=list, description="List of identified strengths")
    weaknesses: List[str] = Field(default_factory=list, description="List of identified weaknesses")
    detailed_feedback: Optional[str] = Field(None, description="Detailed feedback text")
    transcription: Optional[str] = Field(None, description="Interview transcription if applicable")

# AI Report Model
class AIReport(BaseModel):
    """AI report model matching Firestore ai_reports collection structure"""
    report_id: str = Field(..., description="Unique report identifier")
    user_id: str = Field(..., description="User who owns this report")
    application_id: Optional[str] = Field(None, description="Related job application ID")
    interview_id: Optional[str] = Field(None, description="Related interview ID")
    report_type: str = Field(..., description="Type of report (job_fit, interview_feedback, etc.)")
    generated_at: datetime = Field(..., description="When the report was generated")
    content: AIReportContent = Field(..., description="Report content structure")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }

# Request Models
class AIReportCreateRequest(BaseModel):
    """Request model for creating AI reports"""
    application_id: Optional[str] = None
    interview_id: Optional[str] = None
    report_type: str = Field(..., description="Type of report to generate")
    content: AIReportContent = Field(..., description="Report content")

class AIReportUpdateRequest(BaseModel):
    """Request model for updating AI reports"""
    content: Optional[AIReportContent] = None
    report_type: Optional[str] = None

# Document Models
class Document(BaseModel):
    """Document model matching Firestore documents collection structure"""
    document_id: str = Field(..., description="Unique document identifier")
    user_id: str = Field(..., description="User who owns this document")
    application_id: Optional[str] = Field(None, description="Related job application ID")
    file_name: str = Field(..., description="Original file name")
    file_url: str = Field(..., description="Firebase Storage URL")
    type: str = Field(..., description="Document type (resume, cover_letter, etc.)")
    creation_date: datetime = Field(..., description="When the document was created")
    template_id: Optional[str] = Field(None, description="Template used if applicable")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }

# API Response Models
class ApiResponse(BaseModel):
    """Standardized API response format"""
    success: bool
    message: str
    data: Optional[Union[Dict[str, Any], List[Any]]] = None
    error: Optional[str] = None
    pagination: Optional[PaginationMeta] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }

# Error Response Models
class ErrorResponse(BaseModel):
    """Standard error response model"""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v else None
        }
