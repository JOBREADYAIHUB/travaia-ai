"""
Data Transfer Objects (DTOs) for API Gateway.
These models define the structure of data for API requests and routing.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Gateway DTOs
# =============================================================================

class ServiceRouteRequest(BaseModel):
    service_name: str = Field(..., min_length=1, max_length=100)
    path: str = Field(..., min_length=1)
    method: str = Field(..., pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    target_url: str = Field(..., min_length=1)

class AuthTokenRequest(BaseModel):
    service_name: str
    user_id: Optional[str] = None
    roles: List[str] = []

class RateLimitRequest(BaseModel):
    service_name: str
    endpoint: str
    limit: int = Field(..., gt=0)
    window: int = Field(..., gt=0)  # in seconds

class HealthCheckRequest(BaseModel):
    service_names: Optional[List[str]] = None
    include_details: bool = False

# =============================================================================
# Monitoring DTOs
# =============================================================================

class LogQueryRequest(BaseModel):
    service_name: Optional[str] = None
    level: Optional[str] = Field(None, pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = Field(100, ge=1, le=1000)

class MetricsRequest(BaseModel):
    service_names: Optional[List[str]] = None
    metric_types: List[str] = ["requests", "errors", "latency"]
    time_range: str = Field("1h", pattern="^(1h|6h|24h|7d|30d)$")