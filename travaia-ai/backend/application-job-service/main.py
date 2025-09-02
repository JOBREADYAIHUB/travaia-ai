"""
TRAVAIA Application & Job Service
Central hub for job applications, favorites, and AI analysis triggers.
Optimized for 10M+ daily users with Cloud Pub/Sub integration.
"""

from fastapi import FastAPI, Depends, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import sys
import asyncio
from datetime import datetime
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Dict, Any
import structlog
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import auth middleware
from shared.auth_middleware import get_current_user, initialize_firebase

# Import models and services
from models.dto import (
    ApplicationCreateRequest, 
    ApplicationUpdateRequest, 
    ContactAddRequest,
    NoteAddRequest,
    FavoriteJobCreateRequest,
    ApiResponse,
    PaginationParams,
    PaginationMeta
)
from models.domain import (
    JobApplication,
    FavoriteJob
)

from services.application_service import ApplicationService
from services.job_service import JobService

# Initialize logger first
logger = structlog.get_logger(__name__)

# Initialize services with error handling
application_service = None
job_service = None

def initialize_services():
    """Initialize services with detailed error logging"""
    global application_service, job_service
    try:
        logger.info("Initializing Firebase and application services...")
        
        # Initialize Firebase first
        initialize_firebase()
        
        # Try to initialize ApplicationService
        try:
            application_service = ApplicationService()
            logger.info("ApplicationService initialized successfully")
        except Exception as e:
            logger.error(f"ApplicationService initialization failed: {type(e).__name__}: {e}")
            application_service = None
        
        # Try to initialize JobService
        try:
            job_service = JobService()
            logger.info("JobService initialized successfully")
        except Exception as e:
            logger.error(f"JobService initialization failed: {type(e).__name__}: {e}")
            job_service = None
            
        if application_service and job_service:
            logger.info("All services initialized successfully")
        else:
            logger.warning("Some services failed to initialize - API will return 503 for unavailable services")
            
    except ConnectionError as e:
        logger.critical(f"CRITICAL: Failed to connect to a required service: {e}")
        # This is a fatal error, so we'll re-raise it to stop the app from starting
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during service initialization: {type(e).__name__}: {e}")

try:
    app = FastAPI(
        title="TRAVAIA Application & Job Service",
        description="Job applications management, favorites, and AI analysis triggers",
        version="1.0.0"
    )
except Exception as e:
    logger.critical(f"CRITICAL: FastAPI app instantiation failed: {e}")
    import traceback
    logger.critical(traceback.format_exc())
    # Re-raise to ensure Cloud Run sees the failure
    raise

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add SlowAPI middleware for rate limiting
from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

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

# Trusted Host Middleware - Allow all hosts for Cloud Run
# In production, this should be more restrictive, but for now allow all to fix host header issue
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=["*"]  # Allow all hosts temporarily
# )

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


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "application-job-service"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "TRAVAIA Application & Job Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "applications": {
                "get": "GET /applications",
                "create": "POST /applications"
            }
        }
    }

# GET /applications endpoint with authentication and pagination
@app.get("/applications", response_model=ApiResponse[list[JobApplication]])
@limiter.limit("30/minute")
async def get_applications(
    request: Request,
    page: int = Query(default=1, ge=1, description="Page number (starts from 1)"),
    limit: int = Query(default=10, ge=1, le=100, description="Number of items per page (max 100)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's job applications with pagination"""
    try:
        # Check if services are available
        if application_service is None:
            logger.error("Application service not available")
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        # Use the initialized service
        app_service = application_service
        
        # Get paginated applications
        result = await app_service.get_user_applications_paginated(
            user_id=user_id,
            page=page,
            limit=limit
        )
        
        applications = result["applications"]
        pagination_meta = result["pagination"]
        
        # Convert applications to Pydantic models for proper serialization
        application_models = []
        for app_data in applications:
            # Ensure required fields have default values
            app_data.setdefault("application_id", app_data.get("id", ""))
            app_data.setdefault("user_id", user_id)
            app_data.setdefault("job_title", "")
            app_data.setdefault("company_name", "")
            app_data.setdefault("status", "draft")
            app_data.setdefault("contacts", [])
            app_data.setdefault("notes", [])
            
            # Handle datetime fields
            if not app_data.get("created_at"):
                app_data["created_at"] = datetime.utcnow()
            if not app_data.get("updated_at"):
                app_data["updated_at"] = datetime.utcnow()
            
            try:
                application_model = JobApplication(**app_data)
                application_models.append(application_model)
            except Exception as validation_error:
                # Log validation error but continue with other applications
                logger.warning(
                    "Application validation failed", 
                    application_id=app_data.get("application_id"),
                    error=str(validation_error)
                )
                continue
        
        # Create pagination metadata
        pagination = PaginationMeta(**pagination_meta)
        
        return ApiResponse(
            success=True,
            message=f"Retrieved {len(application_models)} applications",
            data=application_models,
            pagination=pagination
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Applications retrieval failed", error=str(e), user_id=current_user.get("user_id"))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve applications"
        )

# POST /applications endpoint with authentication
@app.post("/applications", response_model=ApiResponse[JobApplication])
@limiter.limit("30/minute")
async def create_application(
    request: Request,
    application_data: ApplicationCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new job application for authenticated user"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Create the application
        created_app = await app_service.create_application(
            user_id=user_id, application_data=application_data
        )
        
        # Convert to Application model for proper serialization
        try:
            # Ensure all required fields are present
            created_app.setdefault("application_id", created_app.get("application_id", ""))
            created_app.setdefault("user_id", user_id)
            created_app.setdefault("contacts", [])
            created_app.setdefault("notes", [])
            
            application_model = JobApplication(**created_app)
            
            logger.info(
                "Application created successfully", 
                application_id=created_app["application_id"], 
                user_id=user_id,
                job_title=application_data.job_title,
                company_name=application_data.company_name
            )
            
            return ApiResponse(
                success=True,
                message="Application created successfully",
                data=application_model
            )
            
        except Exception as validation_error:
            logger.error(
                "Application model validation failed", 
                error=str(validation_error),
                application_data=created_app
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to validate created application data"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Application creation failed", 
            error=str(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to create application"
        )

# GET /applications/{application_id} endpoint with authentication
@app.get("/applications/{application_id}", response_model=ApiResponse[JobApplication])
@limiter.limit("30/minute")
async def get_application_by_id(
    request: Request,
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific job application by ID for authenticated user"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Get the application
        application_data = await app_service.get_application_by_id(
            user_id=user_id,
            application_id=application_id
        )
        
        # Check if application exists and belongs to user
        if not application_data:
            logger.info(
                "Application not found or unauthorized access",
                application_id=application_id,
                user_id=user_id
            )
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        
        # Log successful retrieval
        logger.info(
            "Application retrieved successfully",
            application_id=application_id,
            user_id=user_id,
            job_title=application_data.get("job_title")
        )
        
        return ApiResponse(
            success=True,
            message="Application retrieved successfully",
            data=application_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Application retrieval failed", 
            error=str(e), 
            application_id=application_id,
            user_id=current_user.get("user_id")
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve application"
        )

# PUT /applications/{application_id} endpoint with authentication
@app.put("/applications/{application_id}", response_model=ApiResponse[JobApplication])
@limiter.limit("30/minute")
async def update_application(
    request: Request,
    application_id: str,
    update_data: ApplicationUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update a specific job application for authenticated user"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Update the application
        updated_application = await app_service.update_application(
            user_id=user_id,
            application_id=application_id,
            update_data=update_data
        )
        
        # Check if application exists and belongs to user
        if not updated_application:
            logger.info(
                "Application not found or unauthorized update attempt",
                application_id=application_id,
                user_id=user_id
            )
            raise HTTPException(
                status_code=404,
                detail="Application not found or access denied"
            )
        
        # Log successful update
        logger.info(
            "Application updated successfully",
            application_id=application_id,
            user_id=user_id,
            job_title=updated_application.get("job_title"),
            updated_fields=list(update_data.model_dump(exclude_unset=True).keys())
        )
        
        return ApiResponse(
            success=True,
            message="Application updated successfully",
            data=updated_application
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Application update failed", 
            error=str(e), 
            application_id=application_id,
            user_id=current_user.get("user_id"),
            update_fields=list(update_data.model_dump(exclude_none=True).keys()) if update_data else []
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update application"
        )

# DELETE /applications/{application_id} endpoint with authentication
@app.delete("/applications/{application_id}", response_model=ApiResponse)
@limiter.limit("30/minute")
async def delete_application_endpoint(
    request: Request,
    application_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a specific job application for authenticated user"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Delete the application
        deletion_success = await app_service.delete_application(
            user_id=user_id,
            application_id=application_id
        )
        
        # Check if application was found and deleted
        if not deletion_success:
            logger.info(
                "Application not found or unauthorized deletion attempt",
                application_id=application_id,
                user_id=user_id
            )
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        
        # Log successful deletion
        logger.info(
            "Application deleted successfully",
            application_id=application_id,
            user_id=user_id
        )
        
        return ApiResponse(
            success=True,
            message="Application deleted successfully",
            data=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Application deletion failed", 
            error=str(e), 
            application_id=application_id,
            user_id=current_user.get("user_id")
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete application"
        )

# Startup event
# POST /applications/{application_id}/contacts endpoint
@app.post("/applications/{application_id}/contacts", response_model=ApiResponse[JobApplication])
@limiter.limit("30/minute")
async def add_contact_to_application(
    request: Request,
    application_id: str,
    contact_data: ContactAddRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a new contact to an existing job application"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        logger.info("Adding contact to application", 
                   application_id=application_id,
                   user_id=user_id,
                   contact_name=contact_data.name)
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Add contact to application
        updated_application = await app_service.add_contact_to_application(
            user_id=user_id,
            application_id=application_id,
            contact_data=contact_data
        )
        
        logger.info("Contact added successfully", 
                   application_id=application_id,
                   user_id=user_id,
                   contact_name=contact_data.name)
        
        return ApiResponse(
            success=True,
            message="Contact added successfully",
            data=updated_application
        )
        
    except HTTPException as e:
        logger.warning("Contact addition failed", 
                      application_id=application_id,
                      user_id=current_user.get("user_id"),
                      error=e.detail,
                      status_code=e.status_code)
        raise e
    except Exception as e:
        logger.error("Contact addition error", 
                    application_id=application_id,
                    user_id=current_user.get("user_id"),
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Internal server error while adding contact"
        )

# POST /applications/{application_id}/notes endpoint
@app.post("/applications/{application_id}/notes", response_model=ApiResponse[JobApplication])
@limiter.limit("30/minute")
async def add_note_to_application(
    request: Request,
    application_id: str,
    note_data: NoteAddRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a new note to an existing job application"""
    try:
        # Extract user_id from authenticated user
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        logger.info("Adding note to application", 
                   application_id=application_id,
                   user_id=user_id,
                   note_content_length=len(note_data.content))
        
        # Use the globally initialized service
        if application_service is None:
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable"
            )
        app_service = application_service
        
        # Add note to application
        updated_application = await app_service.add_note_to_application(
            user_id=user_id,
            application_id=application_id,
            note_data=note_data
        )
        
        logger.info("Note added successfully", 
                   application_id=application_id,
                   user_id=user_id,
                   note_content_length=len(note_data.content))
        
        return ApiResponse(
            success=True,
            message="Note added successfully",
            data=updated_application
        )
        
    except HTTPException as e:
        logger.warning("Note addition failed", 
                      application_id=application_id,
                      user_id=current_user.get("user_id"),
                      error=e.detail,
                      status_code=e.status_code)
        raise e
    except Exception as e:
        logger.error("Note addition error", 
                    application_id=application_id,
                    user_id=current_user.get("user_id"),
                    error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Internal server error while adding note"
        )

@app.get("/favorite-jobs", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def get_favorite_jobs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(10, ge=1, le=50, description="Items per page (max 50)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated favorite jobs for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        page: Page number (1-based, default: 1)
        limit: Items per page (1-50, default: 10)
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing favorite jobs list and pagination metadata
        
    Raises:
        HTTPException: 401 if not authenticated, 500 if server error
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        logger.info("Getting favorite jobs", 
                   user_id=user_id,
                   page=page,
                   limit=limit)
        
        # Use the globally initialized service
        if not job_service:
            raise HTTPException(status_code=503, detail="Job service is not available")

        # Get paginated favorite jobs
        result = await job_service.get_user_favorite_jobs_paginated(
            user_id=user_id,
            page=page,
            limit=limit
        )
        
        logger.info("Favorite jobs retrieved successfully", 
                   user_id=user_id,
                   page=page,
                   limit=limit,
                   total=result["pagination"]["total"])
        
        return {
            "success": True,
            "data": result["favorite_jobs"],
            "pagination": result["pagination"],
            "message": f"Retrieved {len(result['favorite_jobs'])} favorite jobs"
        }
        
    except Exception as e:
        logger.error("Failed to get favorite jobs", 
                    error=str(e), 
                    user_id=current_user.get("user_id"),
                    page=page,
                    limit=limit)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving favorite jobs"
        )

@app.post("/favorite-jobs", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def create_favorite_job(
    request: Request,
    job_data: FavoriteJobCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new favorite job for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        job_data: FavoriteJobCreateRequest containing job details
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and created favorite job data
        
    Raises:
        HTTPException: 401 if not authenticated, 422 if validation fails, 500 if server error
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        logger.info("Creating favorite job", 
                   user_id=user_id,
                   job_title=job_data.job_title,
                   company_name=job_data.company_name)
        
        # Use the globally initialized service
        if not job_service:
            raise HTTPException(status_code=503, detail="Job service is not available")

        # Create favorite job
        created_job = await job_service.add_favorite_job_to_user(
            user_id=user_id,
            job_data=job_data
        )
        
        logger.info("Favorite job created successfully", 
                   user_id=user_id,
                   favorite_job_id=created_job.get("favorite_job_id"),
                   job_title=job_data.job_title)
        
        return {
            "success": True,
            "data": created_job,
            "message": f"Favorite job '{job_data.job_title}' at '{job_data.company_name}' created successfully"
        }
        
    except ValueError as e:
        logger.error("Validation error creating favorite job", 
                    error=str(e), 
                    user_id=current_user.get("user_id"),
                    job_title=job_data.job_title)
        raise HTTPException(
            status_code=422,
            detail=f"Validation error: {str(e)}"
        )
    except Exception as e:
        logger.error("Failed to create favorite job", 
                    error=str(e), 
                    user_id=current_user.get("user_id"),
                    job_title=job_data.job_title)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while creating favorite job"
        )

@app.delete("/favorite-jobs/{favorite_job_id}", response_model=Dict[str, Any])
@limiter.limit("30/minute")
async def delete_favorite_job(
    request: Request,
    favorite_job_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a specific favorite job for the authenticated user
    
    Args:
        request: FastAPI request object (for rate limiting)
        favorite_job_id: ID of the favorite job to delete
        current_user: Current authenticated user from JWT token
        
    Returns:
        Dict containing success status and deletion confirmation
        
    Raises:
        HTTPException: 401 if not authenticated, 403 if not authorized, 404 if not found, 500 if server error
    """
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid user authentication data"
            )
        
        logger.info("Deleting favorite job", 
                   user_id=user_id,
                   favorite_job_id=favorite_job_id)
        
        # Use the globally initialized service
        if not job_service:
            raise HTTPException(status_code=503, detail="Job service is not available")

        # Delete favorite job with ownership validation
        deleted = await job_service.delete_favorite_job_for_user(
            user_id=user_id,
            favorite_job_id=favorite_job_id
        )
        
        if not deleted:
            logger.warning("Favorite job not found for deletion", 
                         user_id=user_id,
                         favorite_job_id=favorite_job_id)
            raise HTTPException(
                status_code=404,
                detail=f"Favorite job with ID {favorite_job_id} not found"
            )
        
        logger.info("Favorite job deleted successfully", 
                   user_id=user_id,
                   favorite_job_id=favorite_job_id)
        
        return {
            "success": True,
            "message": "Favorite job deleted successfully"
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions (403, 404) as-is
        raise
    except Exception as e:
        logger.error("Failed to delete favorite job", 
                    error=str(e), 
                    user_id=current_user.get("user_id"),
                    favorite_job_id=favorite_job_id)
        raise HTTPException(
            status_code=500,
            detail="Internal server error while deleting favorite job"
        )

@app.on_event("startup")
async def startup_event():
    """Initialize services and validate environment on startup"""
    logger.info("Starting TRAVAIA Application & Job Service...")
    
    # Set explicit project ID for Firebase Admin SDK
    os.environ["GOOGLE_CLOUD_PROJECT"] = "travaia-e1310"
    
    # Validate required environment variables
    required_env_vars = ["GOOGLE_CLOUD_PROJECT"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.warning(f"Missing environment variables: {missing_vars}")
        logger.info("Service will continue but some features may not work properly")
    else:
        logger.info("All required environment variables are set")

    # Initialize services now that environment is configured
    initialize_services()
    
    # Log current environment configuration
    logger.info(f"Google Cloud Project: {os.getenv('GOOGLE_CLOUD_PROJECT', 'Not set')}")
    logger.info(f"Service Account Path: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'Not set')}")
    logger.info(f"Port: {os.getenv('PORT', '8080')}")
    
    # Test service initialization
    if application_service:
        logger.info("Application service initialized successfully")
    else:
        logger.warning("Application service failed to initialize")
        
    if job_service:
        logger.info("Job service initialized successfully") 
    else:
        logger.warning("Job service failed to initialize")
    
    logger.info("Startup complete")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)