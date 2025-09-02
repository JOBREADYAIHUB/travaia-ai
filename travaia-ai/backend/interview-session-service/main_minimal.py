"""
Minimal FastAPI application for interview-session-service deployment
Includes models inline to avoid import issues
"""

import os
from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
import structlog
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize logger
logger = structlog.get_logger(__name__)

# Security
security = HTTPBearer()

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app
app = FastAPI(
    title="TRAVAIA Interview Session Service",
    description="Microservice for managing interview sessions and attempts",
    version="1.0.0"
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://travaia.co", "https://www.travaia.co"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inline Models
class PaginationMeta(BaseModel):
    """Pagination metadata"""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

class InterviewAttempt(BaseModel):
    """Interview attempt model"""
    attempt_id: str
    user_id: str
    interview_id: str
    status: str = Field(..., description="Status of the interview attempt")
    score: Optional[float] = Field(None, ge=0, le=100, description="Interview score (0-100)")
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    recording_url: Optional[str] = None
    feedback_report_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ApiResponse(BaseModel):
    """Standardized API response format"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    pagination: Optional[PaginationMeta] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Auth dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Simplified auth function for deployment"""
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Mock user for testing - in production this should validate JWT
    return {
        "user_id": "test-user-123",
        "email": "test@example.com"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "interview-session-service"}

# Mock interview attempts endpoint
@app.get("/api/interviews/{interview_id}/attempts", response_model=ApiResponse)
@limiter.limit("30/minute")
async def get_interview_attempts(
    request: Request,
    interview_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get paginated interview attempts for a specific interview"""
    try:
        logger.info(
            "Fetching interview attempts",
            interview_id=interview_id,
            user_id=current_user.get("user_id"),
            page=page,
            limit=limit
        )

        # Mock data for testing
        mock_attempts = [
            InterviewAttempt(
                attempt_id=f"attempt-{i}",
                user_id=current_user["user_id"],
                interview_id=interview_id,
                status="completed",
                score=85.5,
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow(),
                recording_url=f"https://storage.googleapis.com/recordings/attempt-{i}.mp4",
                feedback_report_id=f"report-{i}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            for i in range(1, 4)  # 3 mock attempts
        ]

        # Calculate pagination
        total = len(mock_attempts)
        total_pages = (total + limit - 1) // limit
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_attempts = mock_attempts[start_idx:end_idx]

        pagination_meta = PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )

        response_data = {
            "attempts": [attempt.dict() for attempt in page_attempts],
            "interview_id": interview_id
        }

        logger.info(
            "Successfully retrieved interview attempts",
            interview_id=interview_id,
            user_id=current_user.get("user_id"),
            attempts_count=len(page_attempts),
            total_attempts=total
        )

        return ApiResponse(
            success=True,
            message=f"Retrieved {len(page_attempts)} interview attempts",
            data=response_data,
            pagination=pagination_meta
        )

    except Exception as e:
        logger.error(
            "Error retrieving interview attempts",
            interview_id=interview_id,
            user_id=current_user.get("user_id"),
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving interview attempts"
        )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run("main_minimal:app", host="0.0.0.0", port=port)
