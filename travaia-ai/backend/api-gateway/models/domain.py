"""
Core domain models for API Gateway.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# =============================================================================
# Gateway Domain Models
# =============================================================================

class ServiceRoute(BaseModel):
    """Service routing configuration."""
    route_id: str
    service_name: str
    path: str
    method: str
    target_url: str
    is_active: bool = True
    rate_limit: Optional[int] = None
    auth_required: bool = True
    created_at: datetime
    updated_at: datetime

class ServiceHealth(BaseModel):
    """Service health status."""
    service_name: str
    status: str  # "healthy", "unhealthy", "unknown"
    last_check: datetime
    response_time: Optional[float] = None
    error_message: Optional[str] = None
    uptime_percentage: float = 100.0

class RequestLog(BaseModel):
    """API request logging."""
    log_id: str
    service_name: str
    method: str
    path: str
    status_code: int
    response_time: float
    user_id: Optional[str] = None
    ip_address: str
    user_agent: Optional[str] = None
    timestamp: datetime

class RateLimit(BaseModel):
    """Rate limiting configuration."""
    rule_id: str
    service_name: str
    endpoint: str
    limit: int
    window: int  # seconds
    current_count: int = 0
    reset_time: datetime
    created_at: datetime

# =============================================================================
# Common Response Models
# =============================================================================

class ApiResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = datetime.utcnow()

class ServiceMetrics(BaseModel):
    """Service performance metrics."""
    service_name: str
    total_requests: int = 0
    error_count: int = 0
    average_response_time: float = 0.0
    uptime_percentage: float = 100.0
    last_updated: datetime