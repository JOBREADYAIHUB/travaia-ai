"""
Resume Synthesis Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    ResumeGenerateRequest,
    TemplateCustomizeRequest,
    BulkGenerateRequest,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    ResumeExportRequest,
    BatchExportRequest,
    ResumeOptimizeRequest,
)

# Domain Models (Business Entities)
from .domain import (
    GeneratedResume,
    ResumeTemplate,
    GenerationJob,
    ResumeExport,
    TemplateAsset,
    ResumeOptimization,
    ApiResponse,
    PaginationMeta,
)

__all__ = [
    # DTO Models
    "ResumeGenerateRequest",
    "TemplateCustomizeRequest",
    "BulkGenerateRequest",
    "TemplateCreateRequest",
    "TemplateUpdateRequest",
    "ResumeExportRequest",
    "BatchExportRequest",
    "ResumeOptimizeRequest",
    # Domain Models
    "GeneratedResume",
    "ResumeTemplate",
    "GenerationJob",
    "ResumeExport",
    "TemplateAsset",
    "ResumeOptimization",
    "ApiResponse",
    "PaginationMeta",
]