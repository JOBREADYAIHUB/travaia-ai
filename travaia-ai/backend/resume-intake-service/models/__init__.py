"""
Resume Intake Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    ResumeUploadRequest,
    ResumeUrlRequest,
    ResumeTextRequest,
    ResumeValidationRequest,
    BulkValidationRequest,
    ResumeParseRequest,
    ResumeUpdateRequest,
)

# Domain Models (Business Entities)
from .domain import (
    Resume,
    ResumeValidation,
    ResumeParseResult,
    ProcessingJob,
    FileUpload,
    ApiResponse,
    PaginationMeta,
)

__all__ = [
    # DTO Models
    "ResumeUploadRequest",
    "ResumeUrlRequest",
    "ResumeTextRequest",
    "ResumeValidationRequest",
    "BulkValidationRequest",
    "ResumeParseRequest",
    "ResumeUpdateRequest",
    # Domain Models
    "Resume",
    "ResumeValidation",
    "ResumeParseResult",
    "ProcessingJob",
    "FileUpload",
    "ApiResponse",
    "PaginationMeta",
]