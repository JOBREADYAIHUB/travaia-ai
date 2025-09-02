"""
Data Transfer Objects (DTOs) for Analytics & Growth Service.
These models define the structure of data for API requests.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# =============================================================================
# Analytics DTOs
# =============================================================================

class UserAnalyticsRequest(BaseModel):
    user_id: str
    date_range: Optional[str] = "30d"  # 7d, 30d, 90d, 1y
    metrics: Optional[List[str]] = ["engagement", "progress", "usage"]

class BatchAnalyticsRequest(BaseModel):
    user_ids: List[str] = Field(..., max_items=100)
    date_range: Optional[str] = "30d"
    metrics: Optional[List[str]] = ["engagement", "progress"]

# =============================================================================
# Growth DTOs
# =============================================================================

class ReferralCreateRequest(BaseModel):
    referrer_user_id: str
    referral_code: Optional[str] = None
    campaign_id: Optional[str] = None

class CampaignCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    start_date: datetime
    end_date: Optional[datetime] = None
    target_metrics: Dict[str, Any] = {}

class ViralShareRequest(BaseModel):
    user_id: str
    content_type: str  # "achievement", "score", "milestone"
    content_id: str
    platform: str  # "linkedin", "twitter", "facebook"
    message: Optional[str] = None

# =============================================================================
# Reporting DTOs
# =============================================================================

class ReportGenerateRequest(BaseModel):
    report_type: str  # "user_analytics", "growth_metrics", "engagement"
    date_range: str = "30d"
    filters: Optional[Dict[str, Any]] = {}
    format: str = "json"  # "json", "csv", "pdf"

class MetricsQueryRequest(BaseModel):
    metric_names: List[str]
    date_range: str = "30d"
    aggregation: str = "daily"  # "hourly", "daily", "weekly", "monthly"
    filters: Optional[Dict[str, Any]] = {}