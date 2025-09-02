"""
API Gateway Models
Centralized imports for all model classes.
"""

# DTO Models (Request/Response)
from .dto import (
    ServiceRouteRequest,
    AuthTokenRequest,
    RateLimitRequest,
    HealthCheckRequest,
    LogQueryRequest,
    MetricsRequest,
)

# Domain Models (Business Entities)
from .domain import (
    ServiceRoute,
    ServiceHealth,
    RequestLog,
    RateLimit,
    ApiResponse,
    ServiceMetrics,
)

__all__ = [
    # DTO Models
    "ServiceRouteRequest",
    "AuthTokenRequest",
    "RateLimitRequest",
    "HealthCheckRequest",
    "LogQueryRequest",
    "MetricsRequest",
    # Domain Models
    "ServiceRoute",
    "ServiceHealth",
    "RequestLog",
    "RateLimit",
    "ApiResponse",
    "ServiceMetrics",
]