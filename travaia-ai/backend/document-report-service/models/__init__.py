"""
Document & Report Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    DocumentUploadRequest,
    DocumentUpdateRequest,
    DocumentSearchRequest,
    ReportGenerateRequest,
    ReportUpdateRequest,
    BulkReportRequest,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    DocumentExportRequest,
)

# Domain Models (Business Entities)
from .domain import (
    Document,
    DocumentVersion,
    AIReport,
    ReportTemplate,
    DocumentProcessingJob,
    FileStorage,
    ApiResponse,
    PaginationMeta,
)

__all__ = [
    # DTO Models
    "DocumentUploadRequest",
    "DocumentUpdateRequest",
    "DocumentSearchRequest",
    "ReportGenerateRequest",
    "ReportUpdateRequest",
    "BulkReportRequest",
    "TemplateCreateRequest",
    "TemplateUpdateRequest",
    "DocumentExportRequest",
    # Domain Models
    "Document",
    "DocumentVersion",
    "AIReport",
    "ReportTemplate",
    "DocumentProcessingJob",
    "FileStorage",
    "ApiResponse",
    "PaginationMeta",
]