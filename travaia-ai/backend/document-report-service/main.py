"""
TRAVAIA Document & Report Service
Handles file storage, AI reports, and PDF generation.
Enterprise-grade document management for 10M+ users.
"""

from fastapi import FastAPI, Depends, Request, HTTPException, Query
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
from models import (
    AIReport, 
    AIReportCreateRequest,
    AIReportUpdateRequest,
    PaginationParams, 
    PaginationMeta, 
    ApiResponse, 
    ErrorResponse
)
from services.report_service import ReportService
from shared.auth_middleware import get_current_user

# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES

# Import route modules
from api.routes.documents import router as documents_router
from api.routes.reports import router as reports_router
from api.routes.pdf import router as pdf_router

app = FastAPI(
    title="TRAVAIA Document & Report Service",
    description="File storage, AI reports, and PDF generation service",
    version="1.0.0"
)

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
        if content_length > 50_000_000:  # 50MB limit for document uploads
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
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(reports_router, prefix="/reports", tags=["reports"])
app.include_router(pdf_router, prefix="/pdf", tags=["pdf"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "TRAVAIA Document & Report Service API",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "document-report-service",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "travaia-document-report-service",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("document-report-service", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("document-report-service", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            raise HTTPException(status_code=503, detail=result)
        elif result["overall_status"] == "degraded":
            return result
            
        return result
    except Exception as e:
        error_response = {
            "service": "document-report-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }
        raise HTTPException(status_code=503, detail=error_response)

@app.get("/status")
async def service_status():
    """Service status endpoint."""
    return {
        "service": "travaia-document-report-service",
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
            "file_storage",
            "ai_reports", 
            "pdf_generation",
            "document_management",
            "firebase_storage"
        ]
    }

# Initialize logger and report service
logger = structlog.get_logger(__name__)
report_service = ReportService()

# AI Reports Endpoint
@app.get("/api/ai-reports", response_model=ApiResponse)
@limiter.limit("30/minute")
async def get_ai_reports(
    request: Request,
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page (max 100)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get paginated AI reports for the authenticated user
    
    Returns AI reports with pagination metadata in standardized ApiResponse format.
    Supports filtering by user ownership and includes comprehensive error handling.
    """
    try:
        user_id = current_user.get("user_id")
        
        logger.info(
            "Fetching AI reports for user",
            user_id=user_id,
            page=page,
            limit=limit,
            endpoint="/api/ai-reports"
        )

        # Validate query parameters
        if page < 1:
            logger.warning("Invalid page parameter", page=page, user_id=user_id)
            raise HTTPException(
                status_code=422,
                detail="Page number must be greater than 0"
            )
        
        if limit < 1 or limit > 100:
            logger.warning("Invalid limit parameter", limit=limit, user_id=user_id)
            raise HTTPException(
                status_code=422,
                detail="Limit must be between 1 and 100"
            )

        # Call service method to get paginated reports
        reports, pagination_meta = await report_service.get_user_ai_reports_paginated(
            user_id=user_id,
            page=page,
            limit=limit
        )

        # Prepare response data
        response_data = {
            "reports": reports,
            "user_id": user_id
        }

        logger.info(
            "Successfully retrieved AI reports",
            user_id=user_id,
            reports_count=len(reports),
            total_reports=pagination_meta.total,
            page=page,
            total_pages=pagination_meta.total_pages
        )

        return ApiResponse(
            success=True,
            message=f"Retrieved {len(reports)} AI reports",
            data=response_data,
            pagination=pagination_meta
        )

    except HTTPException:
        # Re-raise HTTP exceptions (validation errors)
        raise
    
    except Exception as e:
        logger.error(
            "Error retrieving AI reports",
            user_id=current_user.get("user_id"),
            page=page,
            limit=limit,
            error=str(e)
        )
        
        # Return 500 for unexpected errors
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving AI reports"
        )


# POST /api/ai-reports - Create AI Report
@app.post("/api/ai-reports", response_model=ApiResponse, status_code=201)
@limiter.limit("20/minute")
async def create_ai_report(
    request: Request,
    report_data: AIReportCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new AI report for the authenticated user"""
    try:
        user_id = current_user.get("user_id")
        
        logger.info("Creating AI report", user_id=user_id, report_type=report_data.report_type)

        # Call service method to create report
        created_report = await report_service.create_ai_report(
            user_id=user_id,
            report_data=report_data.dict()
        )

        logger.info("AI report created successfully", user_id=user_id, report_id=created_report["report_id"])

        return ApiResponse(
            success=True,
            message="AI report created successfully",
            data={"report": created_report}
        )

    except Exception as e:
        logger.error("Error creating AI report", user_id=current_user.get("user_id"), error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error while creating AI report")

# GET /api/ai-reports/{report_id} - Get Single AI Report
@app.get("/api/ai-reports/{report_id}", response_model=ApiResponse)
@limiter.limit("60/minute")
async def get_ai_report_by_id(
    request: Request,
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a single AI report by ID for the authenticated user"""
    try:
        user_id = current_user.get("user_id")
        
        logger.info("Fetching AI report by ID", user_id=user_id, report_id=report_id)

        # Call service method to get report
        report = await report_service.get_ai_report_by_id(user_id=user_id, report_id=report_id)

        if not report:
            logger.warning("AI report not found or unauthorized", user_id=user_id, report_id=report_id)
            raise HTTPException(status_code=404, detail="AI report not found")

        logger.info("AI report retrieved successfully", user_id=user_id, report_id=report_id)

        return ApiResponse(
            success=True,
            message="AI report retrieved successfully",
            data={"report": report}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error retrieving AI report", user_id=current_user.get("user_id"), report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error while retrieving AI report")

# PUT /api/ai-reports/{report_id} - Update AI Report
@app.put("/api/ai-reports/{report_id}", response_model=ApiResponse)
@limiter.limit("30/minute")
async def update_ai_report(
    request: Request,
    report_id: str,
    update_data: AIReportUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing AI report for the authenticated user"""
    try:
        user_id = current_user.get("user_id")
        
        logger.info("Updating AI report", user_id=user_id, report_id=report_id)

        # Call service method to update report
        updated_report = await report_service.update_ai_report(
            user_id=user_id,
            report_id=report_id,
            update_data=update_data.dict(exclude_unset=True)
        )

        if not updated_report:
            logger.warning("AI report not found or unauthorized for update", user_id=user_id, report_id=report_id)
            raise HTTPException(status_code=404, detail="AI report not found")

        logger.info("AI report updated successfully", user_id=user_id, report_id=report_id)

        return ApiResponse(
            success=True,
            message="AI report updated successfully",
            data={"report": updated_report}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating AI report", user_id=current_user.get("user_id"), report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error while updating AI report")

# DELETE /api/ai-reports/{report_id} - Delete AI Report
@app.delete("/api/ai-reports/{report_id}", response_model=ApiResponse)
@limiter.limit("20/minute")
async def delete_ai_report(
    request: Request,
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an AI report for the authenticated user"""
    try:
        user_id = current_user.get("user_id")
        
        logger.info("Deleting AI report", user_id=user_id, report_id=report_id)

        # Call service method to delete report
        deleted = await report_service.delete_ai_report(user_id=user_id, report_id=report_id)

        if not deleted:
            logger.warning("AI report not found or unauthorized for deletion", user_id=user_id, report_id=report_id)
            raise HTTPException(status_code=404, detail="AI report not found")

        logger.info("AI report deleted successfully", user_id=user_id, report_id=report_id)

        return ApiResponse(
            success=True,
            message="AI report deleted successfully",
            data={"report_id": report_id}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error deleting AI report", user_id=current_user.get("user_id"), report_id=report_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error while deleting AI report")


# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)