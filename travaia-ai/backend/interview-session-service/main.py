"""
TRAVAIA Interview & Session Service
Real-time interview sessions with LiveKit WebRTC integration.
Enterprise-grade service for 10M+ daily users.
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import asyncio
import sys
from datetime import datetime
from typing import Dict, Any
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog

# Import models and services
from models import InterviewQuestionSet, InterviewQuestionSetCreateRequest, InterviewQuestionSetUpdateRequest, Interview, InterviewCreateRequest, InterviewAttempt, InterviewAttemptCreateRequest, InterviewAttemptUpdateRequest, PaginationMeta
from services.interview_service import InterviewService

# Import auth middleware and infrastructure components
from shared.auth_middleware import get_current_user
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES

# Import route modules
from api.routes.sessions import router as sessions_router
from api.routes.livekit import router as livekit_router
from api.routes.recordings import router as recordings_router
from api.routes.analytics import router as analytics_router

app = FastAPI(
    title="TRAVAIA Interview & Session Service",
    description="Real-time interview sessions with AI-powered voice interactions",
    version="1.0.0"
)

# Initialize logger
logger = structlog.get_logger(__name__)

# Initialize services
interview_service = InterviewService()

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Production Ready
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travaia.co",
        "https://app.travaia.co", 
        "https://admin.travaia.co",
        "https://travaia-e1310.web.app",
        "https://travaia-e1310.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"],
    max_age=86400
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["travaia.co", "*.travaia.co", "localhost", "127.0.0.1"]
)

# Security Middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Limit request size to prevent DoS attacks"""
    if request.headers.get("content-length"):
        content_length = int(request.headers["content-length"])
        if content_length > 10_000_000:  # 10MB limit
            raise HTTPException(413, "Request entity too large")
    return await call_next(request)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include routers
app.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
app.include_router(livekit_router, prefix="/livekit", tags=["livekit"])
app.include_router(recordings_router, prefix="/recordings", tags=["recordings"])
app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TRAVAIA Interview & Session Service API",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "interview-session-service",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }
    }

@app.get("/health")
@circuit_breaker(FIREBASE_CIRCUIT_BREAKER)
async def health_check():
    """Health check endpoint with circuit breaker protection."""
    try:
        # Test database connection with circuit breaker protection
        async with get_firestore_client() as db:
            # Simple health check query
            collections = db.collections()
            
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "service": "travaia-interview-session-service",
            "infrastructure": {
                "circuit_breakers": "enabled",
                "connection_pooling": "enabled",
                "health_monitoring": "comprehensive"
            },
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "service": "travaia-interview-session-service",
            "error": str(e),
            "database": "disconnected"
        }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("interview-session-service", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("interview-session-service", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200
            
        return result
    except Exception as e:
        return {
            "service": "interview-session-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, 503

@app.get("/status")
async def service_status():
    """Service status endpoint."""
    return {
        "service": "travaia-interview-session-service",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        },
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": os.getenv("PORT", "8080"),
        "features": [
            "real_time_interviews",
            "livekit_integration", 
            "session_recording",
            "voice_analysis",
            "interview_analytics"
        ]
    }

# Example circuit breaker protected operations
@app.post("/sessions/create")
@limiter.limit("10/minute")
@circuit_breaker(FIREBASE_CIRCUIT_BREAKER)
async def create_interview_session(request: Request):
    """Create a new interview session with circuit breaker protection."""
    try:
        # Use connection pooling for database operations
        async with get_firestore_client() as db:
            session_data = {
                "created_at": datetime.utcnow(),
                "status": "created",
                "type": "interview",
                "user_id": "example-user",  # Would come from auth
                "metadata": {}
            }
            
            # Create session document
            session_ref = db.collection("interview_sessions").document()
            session_ref.set(session_data)
            
            return {
                "session_id": session_ref.id,
                "status": "created",
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@app.get("/sessions/{session_id}")
@limiter.limit("30/minute")
@circuit_breaker(FIREBASE_CIRCUIT_BREAKER)
async def get_interview_session(session_id: str, request: Request):
    """Get interview session details with circuit breaker protection."""
    try:
        # Use connection pooling for database operations
        async with get_firestore_client() as db:
            session_ref = db.collection("interview_sessions").document(session_id)
            session_doc = session_ref.get()
            
            if not session_doc.exists:
                raise HTTPException(status_code=404, detail="Session not found")
                
            return {
                "session_id": session_id,
                "data": session_doc.to_dict(),
                "timestamp": datetime.utcnow().isoformat()
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@app.get("/api/interview-questions", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_interview_questions(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(10, ge=1, le=50, description="Items per page (max 50)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated interview question sets for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        page: Page number (1-based, default: 1)
        limit: Items per page (1-50, default: 10)
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing question sets list and pagination metadata
        
    Raises:
        HTTPException: 401 if not authenticated, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Getting interview question sets", 
                   user_id=user_id,
                   page=page,
                   limit=limit)
        
        # Get paginated question sets
        question_sets, pagination_meta = await interview_service.get_user_question_sets_paginated(
            user_id=user_id,
            page=page,
            limit=limit
        )
        
        # Convert Pydantic objects to dictionaries for response
        question_sets_data = [question_set.dict() for question_set in question_sets]
        
        logger.info("Interview question sets retrieved successfully", 
                   user_id=user_id,
                   page=page,
                   limit=limit,
                   total=pagination_meta.total)
        
        return {
            "success": True,
            "data": question_sets_data,
            "pagination": pagination_meta.dict(),
            "message": f"Retrieved {len(question_sets)} interview question sets"
        }
        
    except Exception as e:
        logger.error("Failed to get interview question sets", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    page=page,
                    limit=limit)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving interview question sets"
        )

@app.post("/api/interview-questions", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def create_interview_question_set(
    request: Request,
    question_set_data: InterviewQuestionSetCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new interview question set for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        question_set_data: InterviewQuestionSetCreateRequest containing question set details
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and created question set data
        
    Raises:
        HTTPException: 401 if not authenticated, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Creating interview question set", 
                   user_id=user_id,
                   name=question_set_data.name,
                   language=question_set_data.language,
                   question_count=len(question_set_data.questions))
        
        # Create question set using service
        created_question_set = await interview_service.create_question_set(
            user_id=user_id,
            name=question_set_data.name,
            language=question_set_data.language,
            questions=question_set_data.questions
        )
        
        logger.info("Interview question set created successfully", 
                   user_id=user_id,
                   question_set_id=created_question_set.question_set_id,
                   name=question_set_data.name)
        
        return {
            "success": True,
            "data": created_question_set.dict(),
            "message": f"Interview question set '{question_set_data.name}' created successfully"
        }
        
    except ValueError as e:
        logger.error("Validation error creating interview question set", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    name=question_set_data.name)
        raise HTTPException(
            status_code=422,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error("Failed to create interview question set", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    name=question_set_data.name)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating interview question set"
        )

@app.put("/api/interview-questions/{question_set_id}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def update_interview_question_set(
    request: Request,
    question_set_id: str,
    update_data: InterviewQuestionSetUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update an existing interview question set for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        question_set_id: ID of the question set to update
        update_data: InterviewQuestionSetUpdateRequest containing fields to update
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and updated question set data
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not owner, 404 if not found, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        # Convert Pydantic model to dict, excluding None values for partial updates
        update_fields = update_data.dict(exclude_none=True)
        
        # Check if there are any fields to update
        if not update_fields:
            raise ValueError("At least one field must be provided for update")
        
        logger.info("Updating interview question set", 
                   user_id=user_id,
                   question_set_id=question_set_id,
                   update_fields=list(update_fields.keys()))
        
        # Update question set using service
        updated_question_set = await interview_service.update_question_set(
            user_id=user_id,
            question_set_id=question_set_id,
            update_data=update_fields
        )
        
        logger.info("Interview question set updated successfully", 
                   user_id=user_id,
                   question_set_id=question_set_id,
                   updated_fields=list(update_fields.keys()))
        
        return {
            "success": True,
            "data": updated_question_set.dict(),
            "message": f"Interview question set updated successfully"
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            logger.error("Question set not found for update", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=404,
                detail=f"Question set with ID {question_set_id} not found"
            )
        elif "permission denied" in error_msg.lower():
            logger.error("Permission denied for question set update", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=403,
                detail="Permission denied: You can only update your own question sets"
            )
        else:
            logger.error("Validation error updating interview question set", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=422,
                detail=f"Validation error: {error_msg}"
            )
    except Exception as e:
        logger.error("Failed to update interview question set", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    question_set_id=question_set_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while updating interview question set"
        )

@app.delete("/api/interview-questions/{question_set_id}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def delete_interview_question_set(
    request: Request,
    question_set_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete an existing interview question set for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        question_set_id: ID of the question set to delete
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and confirmation message
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not owner, 404 if not found, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Deleting interview question set", 
                   user_id=user_id,
                   question_set_id=question_set_id)
        
        # Delete question set using service
        await interview_service.delete_question_set(
            user_id=user_id,
            question_set_id=question_set_id
        )
        
        logger.info("Interview question set deleted successfully", 
                   user_id=user_id,
                   question_set_id=question_set_id)
        
        return {
            "success": True,
            "message": "Interview question set deleted successfully"
        }
        
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            logger.error("Question set not found for deletion", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=404,
                detail=f"Question set with ID {question_set_id} not found"
            )
        elif "permission denied" in error_msg.lower():
            logger.error("Permission denied for question set deletion", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=403,
                detail="Permission denied: You can only delete your own question sets"
            )
        else:
            logger.error("Validation error deleting interview question set", 
                        error=error_msg, 
                        user_id=current_user.get("uid"),
                        question_set_id=question_set_id)
            raise HTTPException(
                status_code=422,
                detail=f"Validation error: {error_msg}"
            )
    except Exception as e:
        logger.error("Failed to delete interview question set", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    question_set_id=question_set_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while deleting interview question set"
        )


@app.post("/api/interviews", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def create_interview_session(
    request: Request,
    interview_request: InterviewCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new interview session for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        interview_request: Interview creation request data
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status, created interview data, and message
        
    Raises:
        HTTPException: 401 if not authenticated, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Creating interview session", 
                   user_id=user_id,
                   interview_type=interview_request.interview_type,
                   application_id=interview_request.application_id,
                   status=interview_request.status)
        
        # Convert Pydantic model to dict for service layer
        interview_data = interview_request.dict()
        
        # Create interview using service
        created_interview = await interview_service.create_interview_session(
            user_id=user_id,
            interview_data=interview_data
        )
        
        logger.info("Interview session created successfully", 
                   user_id=user_id,
                   interview_id=created_interview.interview_id,
                   interview_type=created_interview.interview_type,
                   status=created_interview.status)
        
        return {
            "success": True,
            "data": created_interview.dict(),
            "message": f"Interview session created successfully with ID: {created_interview.interview_id}"
        }
        
    except ValueError as e:
        logger.error("Validation error creating interview session", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    interview_type=interview_request.interview_type if interview_request else None)
        raise HTTPException(
            status_code=422,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error("Failed to create interview session", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    interview_type=interview_request.interview_type if interview_request else None)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating interview session"
        )


@app.get("/api/interviews/{interview_id}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_interview_by_id(
    request: Request,
    interview_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific interview by ID for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        interview_id: ID of the interview to retrieve
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and interview data
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized, 404 if not found, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Retrieving interview by ID", 
                   user_id=user_id,
                   interview_id=interview_id)
        
        # Get interview using service
        interview = await interview_service.get_interview_by_id(
            user_id=user_id,
            interview_id=interview_id
        )
        
        logger.info("Interview retrieved successfully", 
                   user_id=user_id,
                   interview_id=interview_id,
                   interview_type=interview.interview_type,
                   status=interview.status)
        
        return {
            "success": True,
            "data": interview.dict(),
            "message": f"Interview {interview_id} retrieved successfully"
        }
        
    except ValueError as e:
        error_message = str(e)
        if "not found" in error_message.lower():
            logger.warning("Interview not found", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          error=error_message)
            raise HTTPException(
                status_code=404,
                detail=f"Interview not found: {error_message}"
            )
        elif "permission" in error_message.lower() or "does not have" in error_message.lower():
            logger.warning("User does not own interview", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          error=error_message)
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: {error_message}"
            )
        else:
            logger.error("Validation error retrieving interview", 
                        error=error_message, 
                        user_id=current_user.get("uid"),
                        interview_id=interview_id)
            raise HTTPException(
                status_code=422,
                detail=f"Validation error: {error_message}"
            )
    except Exception as e:
        logger.error("Failed to retrieve interview", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    interview_id=interview_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving interview"
        )


@app.post("/api/interviews/{interview_id}/attempts", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def create_interview_attempt(
    request: Request,
    interview_id: str,
    attempt_request: InterviewAttemptCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new interview attempt for the specified interview
    
    Args:
        request: FastAPI request object (for rate limiting)
        interview_id: ID of the interview to create an attempt for
        attempt_request: Interview attempt creation request data (empty model)
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and created attempt data
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized, 404 if not found, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Creating interview attempt", 
                   user_id=user_id,
                   interview_id=interview_id)
        
        # Create attempt using service
        attempt_data = await interview_service.start_interview_attempt(
            user_id=user_id,
            interview_id=interview_id
        )
        
        logger.info("Interview attempt created successfully", 
                   user_id=user_id,
                   interview_id=interview_id,
                   attempt_id=attempt_data["attempt_id"],
                   status=attempt_data["status"])
        
        return {
            "success": True,
            "data": attempt_data,
            "message": f"Interview attempt created successfully with ID: {attempt_data['attempt_id']}"
        }
        
    except ValueError as e:
        error_message = str(e)
        if "not found" in error_message.lower():
            logger.warning("Interview not found for attempt creation", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          error=error_message)
            raise HTTPException(
                status_code=404,
                detail=f"Interview not found: {error_message}"
            )
        elif "permission" in error_message.lower() or "does not have" in error_message.lower():
            logger.warning("User does not own interview for attempt creation", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          error=error_message)
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: {error_message}"
            )
        else:
            logger.error("Validation error creating interview attempt", 
                        error=error_message, 
                        user_id=current_user.get("uid"),
                        interview_id=interview_id)
            raise HTTPException(
                status_code=422,
                detail=f"Validation error: {error_message}"
            )
    except Exception as e:
        logger.error("Failed to create interview attempt", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    interview_id=interview_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating interview attempt"
        )


@app.put("/api/interviews/{interview_id}/attempts/{attempt_id}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def update_interview_attempt(
    request: Request,
    interview_id: str,
    attempt_id: str,
    update_request: InterviewAttemptUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update an existing interview attempt
    
    Args:
        request: FastAPI request object (for rate limiting)
        interview_id: ID of the interview containing the attempt
        attempt_id: ID of the attempt to update
        update_request: Interview attempt update request data
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and updated attempt data
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized, 404 if not found, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Updating interview attempt", 
                   user_id=user_id,
                   interview_id=interview_id,
                   attempt_id=attempt_id,
                   update_fields=[k for k, v in update_request.dict().items() if v is not None])
        
        # Convert Pydantic model to dict for service layer
        update_data = update_request.dict()
        
        # Update attempt using service
        updated_attempt = await interview_service.update_interview_attempt(
            user_id=user_id,
            interview_id=interview_id,
            attempt_id=attempt_id,
            update_data=update_data
        )
        
        logger.info("Interview attempt updated successfully", 
                   user_id=user_id,
                   interview_id=interview_id,
                   attempt_id=attempt_id,
                   status=updated_attempt.get("status"),
                   score=updated_attempt.get("score"))
        
        return {
            "success": True,
            "data": updated_attempt,
            "message": f"Interview attempt {attempt_id} updated successfully"
        }
        
    except ValueError as e:
        error_message = str(e)
        if "not found" in error_message.lower():
            logger.warning("Interview or attempt not found for update", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          attempt_id=attempt_id,
                          error=error_message)
            raise HTTPException(
                status_code=404,
                detail=f"Resource not found: {error_message}"
            )
        elif "permission" in error_message.lower() or "does not have" in error_message.lower():
            logger.warning("User does not own interview/attempt for update", 
                          user_id=current_user.get("uid"),
                          interview_id=interview_id,
                          attempt_id=attempt_id,
                          error=error_message)
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: {error_message}"
            )
        else:
            logger.error("Validation error updating interview attempt", 
                        error=error_message, 
                        user_id=current_user.get("uid"),
                        interview_id=interview_id,
                        attempt_id=attempt_id)
            raise HTTPException(
                status_code=422,
                detail=f"Validation error: {error_message}"
            )
    except Exception as e:
        logger.error("Failed to update interview attempt", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    interview_id=interview_id,
                    attempt_id=attempt_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while updating interview attempt"
        )


@app.get("/api/interviews", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_user_interviews(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(10, ge=1, le=50, description="Number of interviews per page"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated list of interviews for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        page: Page number (1-based, minimum 1)
        limit: Number of interviews per page (1-50)
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status, interview data, and pagination metadata
        
    Raises:
        HTTPException: 401 if not authenticated, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user["uid"]
        
        logger.info("Retrieving user interviews", 
                   user_id=user_id,
                   page=page,
                   limit=limit)
        
        # Get interviews using service
        interviews, pagination_meta = await interview_service.get_user_interviews_paginated(
            user_id=user_id,
            page=page,
            limit=limit
        )
        
        logger.info("User interviews retrieved successfully", 
                   user_id=user_id,
                   page=page,
                   limit=limit,
                   total_interviews=pagination_meta["total"],
                   returned_count=len(interviews))
        
        return {
            "success": True,
            "data": interviews,
            "pagination": pagination_meta,
            "message": f"Retrieved {len(interviews)} interviews for page {page}"
        }
        
    except ValueError as e:
        logger.error("Validation error retrieving user interviews", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    page=page,
                    limit=limit)
        raise HTTPException(
            status_code=422,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error("Failed to retrieve user interviews", 
                    error=str(e), 
                    user_id=current_user.get("uid"),
                    page=page,
                    limit=limit)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving interviews"
        )


@app.get("/api/interviews/{interview_id}/attempts", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_interview_attempts(
    request: Request,
    interview_id: str,
    page: int = Query(default=1, ge=1, description="Page number (starts from 1)"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of attempts per page (max 100)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated interview attempts for a specific interview
    
    Args:
        interview_id: ID of the interview to get attempts for
        page: Page number (1-based)
        limit: Number of attempts per page
        current_user: Authenticated user from JWT token
        
    Returns:
        ApiResponse with list of interview attempts and pagination metadata
        
    Raises:
        401: Unauthorized (invalid JWT token)
        403: Forbidden (user doesn't own interview)
        404: Not Found (interview doesn't exist)
        422: Unprocessable Entity (invalid query parameters)
        429: Too Many Requests (rate limit exceeded)
        500: Internal Server Error
    """
    user_id = current_user.get("user_id")
    
    logger.info("GET /api/interviews/{interview_id}/attempts request received",
               user_id=user_id,
               interview_id=interview_id,
               page=page,
               limit=limit,
               remote_addr=get_remote_address(request))
    
    try:
        # Validate query parameters
        if page < 1:
            logger.warning("Invalid page parameter", 
                         user_id=user_id, 
                         interview_id=interview_id, 
                         page=page)
            raise HTTPException(
                status_code=422,
                detail="Page must be greater than 0"
            )
        
        if limit < 1 or limit > 100:
            logger.warning("Invalid limit parameter", 
                         user_id=user_id, 
                         interview_id=interview_id, 
                         limit=limit)
            raise HTTPException(
                status_code=422,
                detail="Limit must be between 1 and 100"
            )
        
        # Get interview attempts using service
        interview_service = InterviewService()
        attempts_list, pagination_meta = await interview_service.get_interview_attempts_paginated(
            user_id=user_id,
            interview_id=interview_id,
            page=page,
            limit=limit
        )
        
        # Create response
        response_data = {
            "success": True,
            "data": attempts_list,
            "message": f"Interview attempts retrieved successfully",
            "pagination": {
                "page": pagination_meta.page,
                "limit": pagination_meta.limit,
                "total": pagination_meta.total,
                "totalPages": pagination_meta.total_pages
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info("Successfully retrieved interview attempts",
                   user_id=user_id,
                   interview_id=interview_id,
                   attempts_count=len(attempts_list),
                   page=page,
                   total=pagination_meta.total)
        
        return response_data
        
    except ValueError as e:
        error_message = str(e)
        logger.warning("Interview attempts retrieval failed - validation error",
                      error=error_message,
                      user_id=user_id,
                      interview_id=interview_id,
                      page=page,
                      limit=limit)
        
        # Determine appropriate HTTP status code based on error message
        if "not found" in error_message.lower():
            status_code = 404
        elif "permission denied" in error_message.lower() or "does not own" in error_message.lower():
            status_code = 403
        else:
            status_code = 422
            
        raise HTTPException(status_code=status_code, detail=error_message)
        
    except Exception as e:
        logger.error("Failed to retrieve interview attempts",
                    error=str(e),
                    user_id=user_id,
                    interview_id=interview_id,
                    page=page,
                    limit=limit)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving interview attempts"
        )


# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))
    print(f"✅ Interview Session Service started with infrastructure components")
    print(f"   - Circuit breakers: enabled")
    print(f"   - Connection pooling: enabled")
    print(f"   - Health monitoring: comprehensive")
    print(f"   - Project ID: {project_id}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("🛑 Interview Session Service shutting down...")

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_config=None
    )