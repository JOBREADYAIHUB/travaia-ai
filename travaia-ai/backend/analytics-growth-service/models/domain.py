"""
Core domain models for Analytics & Growth Service.
These models represent the fundamental business entities and their structures.
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# =============================================================================
# Analytics Domain Models
# =============================================================================

class UserMetrics(BaseModel):
    """User engagement and progress metrics."""
    user_id: str
    total_sessions: int = 0
    total_time_spent: int = 0  # in seconds
    interviews_completed: int = 0
    applications_created: int = 0
    profile_completion: float = 0.0  # percentage
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class EngagementMetrics(BaseModel):
    """User engagement tracking."""
    user_id: str
    daily_active_days: int = 0
    weekly_active_weeks: int = 0
    monthly_active_months: int = 0
    feature_usage: Dict[str, int] = {}
    retention_score: float = 0.0
    created_at: datetime
    updated_at: datetime

# =============================================================================
# Growth Domain Models
# =============================================================================

class Referral(BaseModel):
    """User referral tracking."""
    referral_id: str
    referrer_user_id: str
    referred_user_id: Optional[str] = None
    referral_code: str
    status: str  # "pending", "completed", "expired"
    campaign_id: Optional[str] = None
    reward_earned: bool = False
    created_at: datetime
    completed_at: Optional[datetime] = None

class Campaign(BaseModel):
    """Marketing/growth campaigns."""
    campaign_id: str
    name: str
    description: Optional[str] = None
    campaign_type: str  # "referral", "viral", "retention"
    status: str  # "active", "paused", "completed"
    start_date: datetime
    end_date: Optional[datetime] = None
    target_metrics: Dict[str, Any] = {}
    actual_metrics: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime

class ViralShare(BaseModel):
    """Viral content sharing tracking."""
    share_id: str
    user_id: str
    content_type: str
    content_id: str
    platform: str
    message: Optional[str] = None
    clicks: int = 0
    conversions: int = 0
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

class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool