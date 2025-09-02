"""
Monitoring Routes - Health checks, metrics, and status endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import Dict, Any
import structlog
import time
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from api.dependencies import get_monitoring_service, get_cache_service
from services.monitoring_service import MonitoringService
from services.cache_service import CacheService
from models.dto import TrackErrorRequest
from models.domain import HealthStatusResponse, ServiceStatusResponse, TrackErrorResponse


logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthStatusResponse)
async def health_check(
    request: Request,
):
    """Health check endpoint for service status"""
    try:
        # Get app state
        app = request.app
        
        # Collect component statuses
        components = {
            "vertex_ai": {"status": "operational" if hasattr(app.state, "vertex_ai_service") else "unavailable"},
            "speech_service": {"status": "operational" if hasattr(app.state, "speech_service") else "unavailable"},
            "pubsub": {"status": "operational" if hasattr(app.state, "pubsub_service") else "unavailable"},
            "cache": {"status": "operational" if hasattr(app.state, "cache_service") else "unavailable"},
            "auth": {"status": "operational" if hasattr(app.state, "auth_service") else "unavailable"},
        }
        
        # Determine overall status
        status = "healthy"
        if any(c["status"] != "operational" for c in components.values()):
            status = "degraded"

        return HealthStatusResponse(
            status=status,
            version=app.version,
            uptime=time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0,
            components=components,
        )
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthStatusResponse(
            status="unhealthy",
            version=getattr(request.app, "version", "unknown"),
            uptime=0,
            components={"error": {"message": str(e)}},
        )

@router.get("/metrics", response_class=Response)
async def metrics(
    monitoring_service: MonitoringService = Depends(get_monitoring_service),
    cache_service: CacheService = Depends(get_cache_service)
):
    """Prometheus metrics endpoint"""
    # Update cache metrics before generating response
    cache_stats = cache_service.get_stats()
    monitoring_service.update_cache_stats(cache_stats)
    
    # Generate prometheus metrics
    metrics_data = generate_latest()
    
    return Response(
        content=metrics_data,
        media_type=CONTENT_TYPE_LATEST
    )

@router.get("/status", response_model=ServiceStatusResponse)
async def service_status(
    request: Request,
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    """Detailed service status endpoint"""
    app = request.app
    
    # Get basic metrics
    metrics = {
        "uptime_seconds": time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0,
        "cache": app.state.cache_service.get_stats() if hasattr(app.state, "cache_service") else {},
    }
    
    # Get component statuses
    components = {
        "vertex_ai": {"status": "operational" if hasattr(app.state, "vertex_ai_service") else "unavailable"},
        "speech_service": {"status": "operational" if hasattr(app.state, "speech_service") else "unavailable"},
        "pubsub": {"status": "operational" if hasattr(app.state, "pubsub_service") else "unavailable"},
        "cache": {"status": "operational" if hasattr(app.state, "cache_service") else "unavailable"},
        "auth": {"status": "operational" if hasattr(app.state, "auth_service") else "unavailable"},
        "monitoring": {"status": "operational" if hasattr(app.state, "monitoring_service") else "unavailable"},
    }
    
    # Determine overall status
    status = "healthy"
    if any(c["status"] != "operational" for c in components.values()):
        status = "degraded"
    
    return ServiceStatusResponse(
        service="ai-engine-service",
        environment=monitoring_service.environment,
        status=status,
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        metrics=metrics,
        components=components
    )

@router.post("/track-error", response_model=TrackErrorResponse)
async def track_custom_error(
    request: TrackErrorRequest,
    monitoring_service: MonitoringService = Depends(get_monitoring_service),
):
    """Track a custom error event"""
    try:
        error_id = monitoring_service.track_error(
            error=Exception(request.error_message),
            category=request.category,
            severity=request.severity,
            component=request.component,
            context=request.context or {},
        )

        return TrackErrorResponse(error_id=error_id, status="recorded")

    except Exception as e:
        logger.error("Failed to track custom error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to track error: {str(e)}")
