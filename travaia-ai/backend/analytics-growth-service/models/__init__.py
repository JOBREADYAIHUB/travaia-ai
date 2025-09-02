"""
Analytics & Growth Service Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    UserAnalyticsRequest,
    BatchAnalyticsRequest,
    ReferralCreateRequest,
    CampaignCreateRequest,
    ViralShareRequest,
    ReportGenerateRequest,
    MetricsQueryRequest,
)

# Domain Models (Business Entities)
from .domain import (
    UserMetrics,
    EngagementMetrics,
    Referral,
    Campaign,
    ViralShare,
    ApiResponse,
    PaginationMeta,
)

__all__ = [
    # DTO Models
    "UserAnalyticsRequest",
    "BatchAnalyticsRequest", 
    "ReferralCreateRequest",
    "CampaignCreateRequest",
    "ViralShareRequest",
    "ReportGenerateRequest",
    "MetricsQueryRequest",
    # Domain Models
    "UserMetrics",
    "EngagementMetrics",
    "Referral",
    "Campaign",
    "ViralShare",
    "ApiResponse",
    "PaginationMeta",
]