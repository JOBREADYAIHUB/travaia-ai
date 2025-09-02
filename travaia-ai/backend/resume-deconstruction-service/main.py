"""
Resume Deconstruction Service
AI-powered resume content analysis and enhancement using Gemini AI
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import uvicorn

# Import route modules
from api.routes import analysis, enhancement, intelligence

# Import shared utilities
from shared.auth import verify_firebase_token
from shared.database_pool import get_firestore_client, test_database_connection
from shared.circuit_breaker import get_circuit_breaker_status

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Resume Deconstruction Service...")
    
    # Test database connection
    if not await test_database_connection():
        logger.error("Database connection failed during startup")
        raise Exception("Failed to connect to database")
    
    logger.info("Resume Deconstruction Service started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down Resume Deconstruction Service...")

# Create FastAPI app
app = FastAPI(
    title="Resume Deconstruction Service",
    description="AI-powered resume content analysis and enhancement using Gemini AI and NLP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travaia.co",
        "https://www.travaia.co",
        "https://app.travaia.co",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Add trusted host middleware
trusted_hosts = [
    "travaia.co",
    "*.travaia.co",
    "localhost",
    "127.0.0.1",
    "0.0.0.0"
]
app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# Add GZip middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Request size limiting middleware
@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length:
            content_length = int(content_length)
            max_size = 10 * 1024 * 1024  # 10MB
            if content_length > max_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request too large. Maximum size: {max_size} bytes"}
                )
    
    response = await call_next(request)
    return response

# Include API routes
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(enhancement.router, prefix="/api/v1/enhancement", tags=["Enhancement"])
app.include_router(intelligence.router, prefix="/api/v1/intelligence", tags=["Intelligence"])

# Health check endpoints
@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    """Basic health check"""
    return {
        "status": "healthy",
        "service": "resume-deconstruction-service",
        "version": "1.0.0",
        "timestamp": "2024-01-17T17:05:22Z"
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Detailed health check with dependencies"""
    health_status = {
        "status": "healthy",
        "service": "resume-deconstruction-service",
        "version": "1.0.0",
        "timestamp": "2024-01-17T17:05:22Z",
        "dependencies": {}
    }
    
    # Check database connection
    try:
        db_healthy = await test_database_connection()
        health_status["dependencies"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "type": "firestore"
        }
    except Exception as e:
        health_status["dependencies"]["database"] = {
            "status": "unhealthy",
            "type": "firestore",
            "error": str(e)
        }
    
    # Check circuit breakers
    circuit_status = get_circuit_breaker_status()
    health_status["dependencies"]["circuit_breakers"] = circuit_status
    
    # Determine overall health
    db_status = health_status["dependencies"]["database"]["status"]
    if db_status != "healthy":
        health_status["status"] = "degraded"
    
    return health_status

@app.get("/ready")
@limiter.limit("100/minute")
async def readiness_check(request: Request):
    """Kubernetes readiness probe"""
    try:
        # Test critical dependencies
        db_healthy = await test_database_connection()
        
        if not db_healthy:
            raise HTTPException(status_code=503, detail="Service not ready")
        
        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service not ready")

@app.get("/")
@limiter.limit("60/minute")
async def root(request: Request):
    """Root endpoint"""
    return {
        "service": "Resume Deconstruction Service",
        "description": "AI-powered resume content analysis and enhancement",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": "internal_error"
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
