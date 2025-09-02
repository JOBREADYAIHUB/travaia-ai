"""
Shared Auth Middleware Service
Provides centralized authentication middleware as a standalone service
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES
from datetime import datetime
from slowapi.middleware import SlowAPIMiddleware
import os
import asyncio
from auth_middleware import get_current_user, get_current_user_optional

# Rate limiting
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="TRAVAIA Shared Auth Middleware",
    description="Centralized Firebase authentication middleware service",
    version="1.0.0"
)

# Security middleware
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware with production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travaia.co",
        "https://www.travaia.co",
        "https://*.travaia.co",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Trusted Host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "travaia.co",
        "*.travaia.co",
        "localhost",
        "127.0.0.1",
        "*.a.run.app"
    ]
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "shared-auth-middleware",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("shared", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("shared", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200
            
        return result
    except Exception as e:
        return {
            "service": "shared",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, 503,
        "version": "1.0.0",
        "port": int(os.getenv("PORT", 8080))
    }

@app.get("/")
@limiter.limit("50/minute")
async def root(request):
    """Root endpoint"""
    return {
        "message": "TRAVAIA Shared Auth Middleware Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "verify": "/verify-token"
        }
    }

@app.post("/verify-token")
@limiter.limit("1000/minute")
async def verify_token_endpoint(request, user_data: dict = Depends(get_current_user)):
    """Centralized token verification endpoint for other services"""
    return {
        "valid": True,
        "user": user_data,
        "service": "shared-auth-middleware",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }
    }


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
