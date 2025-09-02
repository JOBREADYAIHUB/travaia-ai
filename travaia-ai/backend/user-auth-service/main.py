"""
TRAVAIA User & Authentication Service
Manages user profiles, authentication, and gamification features.
Central source of truth for user data.
"""

from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from datetime import datetime
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Route modules
from api.routes.auth import router as auth_router, get_current_user
from api.routes.profile import router as profile_router
from api.routes.gamification import router as gamification_router

# Import models and services
from models.dto import (
    UserProfileUpdate, UserProgressUpdate, UserSettingsUpdate
)
from models.domain import (
    ApiResponse, UserProfileResponse, UserProgressResponse, UserSettingsResponse
)
from services.user_service import UserService

app = FastAPI(
    title="TRAVAIA User & Authentication Service",
    description="User profiles, authentication, and gamification management service",
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
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
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
    allowed_hosts=[
        "travaia.co", 
        "*.travaia.co", 
        "localhost", 
        "127.0.0.1",
        "*.us-central1.run.app",
        "travaia-user-auth-service-976191766214.us-central1.run.app"
    ]
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
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(gamification_router, prefix="/gamification", tags=["gamification"])

@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    """Root endpoint."""
    return {
        "message": "TRAVAIA User & Authentication Service API",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "user-auth-service"
    }

@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "travaia-user-auth-service"
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        from shared.health_checks import HealthChecker
        import os
        
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("user-auth-service", project_id)
        
        # No external service dependencies for user-auth-service
        result = await health_checker.run_comprehensive_health_check()
        
        # Set HTTP status based on health
        status_code = 200
        if result["overall_status"] == "unhealthy":
            status_code = 503
        elif result["overall_status"] == "degraded":
            status_code = 200  # Still accepting traffic but with warnings
            
        return result
    except Exception as e:
        return {
            "service": "user-auth-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.get("/status")
@limiter.limit("30/minute")
async def service_status(request: Request):
    """Service status endpoint."""
    return {
        "service": "travaia-user-auth-service",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": os.getenv("PORT", "8080"),
        "features": [
            "user_authentication",
            "profile_management", 
            "gamification_system",
            "multilingual_support"
        ]
    }

# User Profile, Progress, and Settings Update Endpoints

@app.put("/api/users/profile", response_model=ApiResponse)
@limiter.limit("10/minute")
async def update_user_profile_data(
    request: Request,
    profile_data: UserProfileUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user profile_data field"""
    try:
        user_service = UserService()
        
        # Update profile_data field
        updated_profile = await user_service.update_user_profile_data(current_user, profile_data)
        
        return ApiResponse(
            success=True,
            message="Profile data updated successfully",
            data={
                "user_id": current_user,
                "profile_data": updated_profile.get("profile_data"),
                "updated_at": updated_profile.get("updated_at")
            }
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile data: {str(e)}"
        )

@app.put("/api/users/progress", response_model=ApiResponse)
@limiter.limit("20/minute")
async def update_user_progress_data(
    request: Request,
    progress_data: UserProgressUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user progress field"""
    try:
        user_service = UserService()
        
        # Update progress field
        updated_profile = await user_service.update_user_progress(current_user, progress_data)
        
        return ApiResponse(
            success=True,
            message="Progress updated successfully",
            data={
                "user_id": current_user,
                "progress": updated_profile.get("progress"),
                "updated_at": updated_profile.get("updated_at")
            }
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )

@app.put("/api/users/settings", response_model=ApiResponse)
@limiter.limit("10/minute")
async def update_user_settings_data(
    request: Request,
    settings_data: UserSettingsUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update user settings field"""
    try:
        user_service = UserService()
        
        # Update settings field
        updated_profile = await user_service.update_user_settings_data(current_user, settings_data)
        
        return ApiResponse(
            success=True,
            message="Settings updated successfully",
            data={
                "user_id": current_user,
                "settings": updated_profile.get("settings"),
                "updated_at": updated_profile.get("updated_at")
            }
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
