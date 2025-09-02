"""
TRAVAIA AI Engine Service
Enterprise-grade AI operations for job analysis, interview questions, and feedback generation.
Optimized for 10M+ daily users with Vertex AI integration.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import os
import asyncio
import uvicorn
import uuid
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime
import structlog
import json

# Import API routers
from api.routes.analysis import router as analysis_router
from api.routes.questions import router as questions_router
from api.routes.feedback import router as feedback_router
from api.routes.speech import router as speech_router
from api.routes.languages import router as languages_router
from api.routes.cache import router as cache_router
from api.routes.auth import router as auth_router
from api.routes.monitoring import router as monitoring_router

# Import services
from services.vertex_ai_service import VertexAIService
from services.speech_service import SpeechService
from services.pubsub_service import PubSubService
from services.event_handlers import EventHandlers
from services.cache_service import CacheService
from services.auth_service import AuthService
from services.monitoring_service import MonitoringService, MonitoringMiddleware

# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES

app = FastAPI(
    title="TRAVAIA AI Engine Service",
    description="Enterprise AI operations for job analysis, interview questions, and feedback generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    debug=os.getenv("ENVIRONMENT", "development") != "production"
)

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Production Ready
origins = [
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
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add monitoring middleware
app.add_middleware(MonitoringMiddleware)

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

# API endpoints
app.include_router(analysis_router, prefix="/ai", tags=["job-analysis"])
app.include_router(questions_router, prefix="/ai", tags=["questions"])
app.include_router(feedback_router, prefix="/ai", tags=["feedback"])
app.include_router(speech_router, prefix="/ai", tags=["speech"])
app.include_router(languages_router, prefix="/ai", tags=["languages"])
app.include_router(cache_router, prefix="/ai/cache", tags=["cache"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"])

# Example AI operation with circuit breaker protection
@circuit_breaker("gemini_api", EXTERNAL_API_CIRCUIT_BREAKER)
async def call_gemini_api(prompt: str, project_id: str):
    """Call Gemini API with circuit breaker protection"""
    # This would contain actual Gemini API call logic
    # For now, it's a placeholder showing the pattern
    import time
    await asyncio.sleep(0.1)  # Simulate API call
    return {"response": f"AI response for: {prompt[:50]}..."}

@circuit_breaker("firestore_operation", FIREBASE_CIRCUIT_BREAKER)
async def store_ai_result(result_data: dict, project_id: str):
    """Store AI result in Firestore with circuit breaker protection"""
    async with get_firestore_client(project_id) as db:
        doc_ref = db.collection('ai_reports').document()
        await asyncio.get_event_loop().run_in_executor(
            None, doc_ref.set, result_data
        )
        return doc_ref.id

@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    """Root endpoint."""
    return {
        "message": "TRAVAIA AI Engine Service API",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "ai-engine-service",
        "infrastructure": {
            "circuit_breakers": "enabled",
            "connection_pooling": "enabled",
            "health_monitoring": "comprehensive"
        }
    }

@app.get("/health")
@limiter.limit("100/minute")
async def health_check(request: Request):
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "travaia-ai-engine-service"
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("ai-engine-service", project_id)
        
        # Get external service dependencies for AI Engine Service
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("ai-engine-service", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200  # Still accepting traffic but with warnings
            
        return result
    except Exception as e:
        return {
            "service": "ai-engine-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, 503

@app.get("/status")
@limiter.limit("30/minute")
async def service_status(request: Request):
    """Service status endpoint with infrastructure details."""
    from shared.circuit_breaker import _circuit_breakers
    
    # Get circuit breaker stats
    cb_stats = {name: cb.get_stats() for name, cb in _circuit_breakers.items()}
    
    return {
        "service": "travaia-ai-engine-service",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "host": os.getenv("HOST", "0.0.0.0"),
        "port": os.getenv("PORT", "8080"),
        "features": [
            "vertex_ai_integration",
            "job_fit_analysis", 
            "interview_questions",
            "speech_processing",
            "feedback_generation",
            "multilingual_support",
            "circuit_breaker_protection",
            "connection_pooling",
            "comprehensive_health_checks"
        ],
        "infrastructure": {
            "circuit_breakers": cb_stats,
            "connection_pooling": "active",
            "secret_management": "google_secret_manager"
        }
    }

# Global exception handler for consistent error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for all unhandled exceptions"""
    error_id = str(uuid.uuid4())
    logger = structlog.get_logger("error_handler")
    
    # Log the error with request details
    logger.error(
        "Unhandled exception",
        error_id=error_id,
        path=str(request.url.path),
        method=request.method,
        client=request.client.host if request.client else "unknown",
        error_type=type(exc).__name__,
        error_details=str(exc)
    )
    
    # Standard error response format
    status_code = 500
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "message": "An error occurred during processing" if status_code >= 500 else str(exc),
                "error_id": error_id,
                "status_code": status_code,
                "type": "server_error" if status_code >= 500 else "client_error",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )

# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))
    
    # Initialize services
    app.state.vertex_ai_service = VertexAIService()
    app.state.speech_service = SpeechService()
    app.state.pubsub_service = PubSubService()
    app.state.cache_service = CacheService(default_ttl=3600)  # 1 hour default TTL
    app.state.auth_service = AuthService()
    logger.info("Auth service initialized")
    
    # Initialize monitoring service
    app.state.monitoring_service = MonitoringService()
    logger.info("Monitoring service initialized")
    
    # Store application start time for uptime tracking
    app.state.start_time = time.time()
    
    # Initialize event handlers
    app.state.event_handlers = EventHandlers(
        vertex_ai_service=app.state.vertex_ai_service,
        speech_service=app.state.speech_service,
        pubsub_service=app.state.pubsub_service
    )
    
    # Start periodic cache cleanup task
    asyncio.create_task(app.state.cache_service.periodic_cleanup(interval=300))  # Every 5 minutes
    
    # Ensure Pub/Sub topics and subscriptions exist
    try:
        await app.state.pubsub_service.ensure_topics_and_subscriptions()
        logger.info("Pub/Sub topics and subscriptions configured")
    except Exception as e:
        logger.error("Failed to configure Pub/Sub", error=str(e))
        
    # Start event subscription handlers
    await setup_event_subscriptions()

# Event subscription setup function
async def setup_event_subscriptions():
    """Set up event subscriptions to other services"""
    try:
        # Only set up subscriptions if we have a pubsub service
        if not hasattr(app.state, "pubsub_service") or not hasattr(app.state, "event_handlers"):
            logger.warning("Pub/Sub service or event handlers not initialized, skipping subscriptions")
            return
            
        pubsub = app.state.pubsub_service
        handlers = app.state.event_handlers
        
        # Subscribe to job analysis requests
        asyncio.create_task(pubsub.subscribe_to_topic(
            "job_analysis",
            handlers.handle_job_analysis_request
        ))
        
        # Subscribe to interview questions requests
        asyncio.create_task(pubsub.subscribe_to_topic(
            "interview_requests",
            handlers.handle_interview_questions_request
        ))
        
        # Subscribe to feedback requests
        asyncio.create_task(pubsub.subscribe_to_topic(
            "feedback_requests",
            handlers.handle_interview_feedback_request
        ))
        
        # Subscribe to speech processing requests
        asyncio.create_task(pubsub.subscribe_to_topic(
            "speech_processing",
            handlers.handle_speech_processing_request
        ))
        
        logger.info("Event subscriptions set up successfully")
    except Exception as e:
        logger.error("Failed to set up event subscriptions", error=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Gracefully shutdown background tasks"""
    # Gracefully stop all Pub/Sub subscriptions
    if hasattr(app.state, "pubsub_service"):
        await app.state.pubsub_service.stop_all_subscriptions()
        logger.info("Stopped all Pub/Sub subscriptions")
    
    # Log cache statistics before shutdown
    if hasattr(app.state, "cache_service"):
        stats = app.state.cache_service.get_stats()
        logger.info("Cache service shutdown", cache_stats=stats)

# Create a dedicated endpoint to test Pub/Sub event publishing
@app.post("/events/test-publish")
@limiter.limit("10/minute")
async def test_publish_event(request: Request):
    """Test endpoint to publish an event to a topic"""
    try:
        data = await request.json()
        topic_name = data.get("topic_name")
        event_data = data.get("data", {})
        attributes = data.get("attributes", {})
        
        if not topic_name or topic_name not in app.state.pubsub_service.topics:
            return {
                "success": False,
                "error": f"Invalid topic name. Available topics: {list(app.state.pubsub_service.topics.keys())}"
            }
        
        message_id = await app.state.pubsub_service.publish_event(
            topic_name=topic_name,
            data=event_data,
            attributes=attributes
        )
        
        return {
            "success": True,
            "message_id": message_id,
            "topic": topic_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)