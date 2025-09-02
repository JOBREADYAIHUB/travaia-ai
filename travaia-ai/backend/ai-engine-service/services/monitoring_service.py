"""
Comprehensive Error Tracking and Monitoring Service

This module provides centralized error tracking, metrics collection, and monitoring
capabilities for the AI Engine Service with structured logging, error categorization,
and performance tracking.
"""

import os
import time
import uuid
import asyncio
import traceback
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from prometheus_client import Counter, Histogram, Gauge, Summary

# Configure structured logger
logger = structlog.get_logger(__name__)

# Define metric types
API_REQUEST_COUNT = Counter(
    "ai_engine_api_requests_total", 
    "Total count of API requests",
    ["method", "endpoint", "status_code"]
)

API_REQUEST_LATENCY = Histogram(
    "ai_engine_api_request_duration_seconds",
    "API request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0]
)

AI_SERVICE_LATENCY = Histogram(
    "ai_engine_ai_service_duration_seconds",
    "AI service operation latency in seconds",
    ["operation", "model"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0]
)

ERROR_COUNT = Counter(
    "ai_engine_error_count_total",
    "Total count of errors",
    ["error_type", "component", "severity"]
)

CACHE_STATS = Gauge(
    "ai_engine_cache_stats",
    "Cache statistics",
    ["stat_type"]
)

# Error severity levels
class ErrorSeverity:
    CRITICAL = "critical"  # Service is unusable
    ERROR = "error"        # Operation failed
    WARNING = "warning"    # Operation succeeded with issues
    INFO = "info"          # Informational

# Error categories
class ErrorCategory:
    AI_SERVICE = "ai_service"        # AI model errors
    DATABASE = "database"            # Database errors
    EXTERNAL_API = "external_api"    # External API errors
    VALIDATION = "validation"        # Input validation errors
    AUTHORIZATION = "authorization"  # Auth errors
    INTERNAL = "internal"            # Internal server errors
    UNKNOWN = "unknown"              # Unclassified errors

class MonitoringService:
    """Centralized monitoring and error tracking service"""
    
    def __init__(self):
        self.service_name = "ai-engine-service"
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.error_handlers = {}
        self.metrics_exporters = []
        logger.info("MonitoringService initialized", service=self.service_name, environment=self.environment)
        
    def track_error(
        self, 
        error: Exception, 
        category: str = ErrorCategory.UNKNOWN, 
        severity: str = ErrorSeverity.ERROR,
        component: str = "general",
        context: Dict[str, Any] = None
    ) -> str:
        """
        Track an error with context information
        Returns error_id for reference
        """
        error_id = str(uuid.uuid4())
        error_type = type(error).__name__
        error_message = str(error)
        stack_trace = traceback.format_exc()
        timestamp = datetime.now().isoformat()
        
        # Prepare structured error data
        error_data = {
            "error_id": error_id,
            "error_type": error_type,
            "message": error_message,
            "category": category,
            "severity": severity,
            "component": component,
            "service": self.service_name,
            "environment": self.environment,
            "timestamp": timestamp,
            "stack_trace": stack_trace,
        }
        
        # Add additional context if provided
        if context:
            error_data["context"] = context
            
        # Log the error with structured data
        log_method = getattr(logger, severity, logger.error)
        log_method(
            f"{category.upper()} Error: {error_message}",
            **error_data
        )
        
        # Update metrics
        ERROR_COUNT.labels(
            error_type=error_type,
            component=component,
            severity=severity
        ).inc()
        
        # Call registered error handlers for this category if any
        if category in self.error_handlers:
            for handler in self.error_handlers[category]:
                try:
                    handler(error_data)
                except Exception as handler_error:
                    logger.error(
                        "Error handler failed",
                        handler=handler.__name__,
                        error=str(handler_error)
                    )
        
        return error_id
        
    def register_error_handler(self, category: str, handler: Callable):
        """Register a handler for a specific error category"""
        if category not in self.error_handlers:
            self.error_handlers[category] = []
        self.error_handlers[category].append(handler)
        
    def track_metric(self, name: str, value: float, labels: Dict[str, str] = None):
        """Track a custom metric"""
        # Implementation would depend on metrics system (Prometheus, etc.)
        pass
        
    def start_timer(self, operation: str, model: str = None) -> Callable:
        """Start timing an operation and return a function to stop and record it"""
        start_time = time.time()
        
        def stop_timer():
            duration = time.time() - start_time
            AI_SERVICE_LATENCY.labels(
                operation=operation,
                model=model or "unknown"
            ).observe(duration)
            return duration
            
        return stop_timer
        
    def update_cache_stats(self, stats: Dict[str, Any]):
        """Update cache statistics metrics"""
        for key, value in stats.items():
            if isinstance(value, (int, float)):
                CACHE_STATS.labels(stat_type=key).set(value)
                
    async def export_metrics(self):
        """Export metrics to configured exporters"""
        for exporter in self.metrics_exporters:
            try:
                await exporter.export()
            except Exception as e:
                logger.error("Metrics export failed", exporter=exporter.__class__.__name__, error=str(e))
                
                
class MonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware for request tracking and metrics collection"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = str(uuid.uuid4())
        method = request.method
        path = request.url.path
        
        # Add request ID to request state
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Track request
        logger.info(
            f"Request started: {method} {path}",
            request_id=request_id,
            method=method,
            path=path,
            client_ip=request.client.host,
            user_agent=request.headers.get("user-agent", "")
        )
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Record metrics
            status_code = response.status_code
            API_REQUEST_COUNT.labels(
                method=method,
                endpoint=path,
                status_code=status_code
            ).inc()
            
            API_REQUEST_LATENCY.labels(
                method=method,
                endpoint=path
            ).observe(duration)
            
            # Log completion
            log_level = "warning" if status_code >= 400 else "info"
            getattr(logger, log_level)(
                f"Request completed: {method} {path}",
                request_id=request_id,
                method=method,
                path=path,
                status_code=status_code,
                duration=duration
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log exception
            logger.error(
                f"Request failed: {method} {path}",
                request_id=request_id,
                method=method,
                path=path,
                error=str(e),
                traceback=traceback.format_exc(),
                duration=duration
            )
            
            # Update metrics
            API_REQUEST_COUNT.labels(
                method=method,
                endpoint=path,
                status_code=500
            ).inc()
            
            # Re-raise to let FastAPI handle the error
            raise
