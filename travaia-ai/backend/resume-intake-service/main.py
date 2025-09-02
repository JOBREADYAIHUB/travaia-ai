"""
TRAVAIA Resume Intake Service
Handles initial resume data processing, validation, and file uploads.
Enterprise-grade resume intake for 10M+ users.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import os
import asyncio
import uvicorn
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime

# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES

# Import route modules
from api.routes.intake import router as intake_router
from api.routes.upload import router as upload_router
from api.routes.validation import router as validation_router

app = FastAPI(
    title="TRAVAIA Resume Intake Service",
    description="Handles initial resume data processing, validation, and file uploads",
    version="1.0.0"
)

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Middleware - Trusted Hosts (Production domains only)
TRUSTED_HOSTS = [
    "travaia.co",
    "*.travaia.co",
    "localhost",
    "127.0.0.1"
]

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=TRUSTED_HOSTS
)

# CORS Configuration - Restricted to production domains
ALLOWED_ORIGINS = [
    "https://travaia.co",
    "https://www.travaia.co",
    "https://app.travaia.co",
    "http://localhost:3000",  # Development only
    "http://127.0.0.1:3000"   # Development only
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,
)

# Request size limiting (50MB for file uploads)
@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST" and request.url.path.startswith("/api/resume/upload"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=413, detail="File too large")
    
    response = await call_next(request)
    return response

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Health Check Endpoint
health_checker = HealthChecker(
    service_name="resume-intake-service",
    external_dependencies=SERVICE_EXTERNAL_DEPENDENCIES
)

@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    return await health_checker.check_health()

@app.get("/health/ready")
@limiter.limit("60/minute") 
async def readiness_check(request: Request):
    return await health_checker.check_readiness()

# Include API routes
app.include_router(intake_router, prefix="/api/resume", tags=["intake"])
app.include_router(upload_router, prefix="/api/resume", tags=["upload"])
app.include_router(validation_router, prefix="/api/resume", tags=["validation"])

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize service dependencies and background tasks"""
    print(f"[{datetime.now()}] TRAVAIA Resume Intake Service starting up...")
    
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task())
    
    # Initialize health checker
    await health_checker.initialize()
    
    print(f"[{datetime.now()}] Resume Intake Service ready for enterprise load")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    print(f"[{datetime.now()}] Resume Intake Service shutting down...")
    await health_checker.cleanup()

# Root endpoint
@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    return {
        "service": "TRAVAIA Resume Intake Service",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "intake": "/api/resume/intake",
            "upload": "/api/resume/upload", 
            "validation": "/api/resume/validate",
            "health": "/health"
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        workers=1,
        access_log=True,
        use_colors=True,
        log_level="info"
    )
