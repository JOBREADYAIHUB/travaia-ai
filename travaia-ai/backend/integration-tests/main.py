"""
TRAVAIA Integration Tests Service
Provides health check endpoint for Cloud Run deployment
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="TRAVAIA Integration Tests",
    description="Integration testing service for TRAVAIA microservices",
    version="1.0.0"
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*.travaia.co", "*.a.run.app", "localhost", "127.0.0.1"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travaia.co",
        "https://www.travaia.co",
        "https://*.travaia.co",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request):
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "integration-tests",
        "version": "1.0.0"
    }

@app.get("/")
@limiter.limit("30/minute")
async def root(request):
    """Root endpoint"""
    return {
        "service": "TRAVAIA Integration Tests",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "run_tests": "/run-tests"
        }
    }

@app.post("/run-tests")
@limiter.limit("10/minute")
async def run_tests_endpoint(request):
    """Run integration tests endpoint"""
    return {
        "message": "Integration tests endpoint",
        "status": "available"
    }

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
