"""
Enhanced Health Check System for TRAVAIA Backend Services
Provides comprehensive health monitoring with dependency validation
"""

import asyncio
import time
from typing import Dict, List, Optional, Any
from datetime import datetime
import httpx
import firebase_admin
from firebase_admin import firestore, auth
from google.cloud import secretmanager
from google.cloud import pubsub_v1
import logging

logger = logging.getLogger(__name__)

class HealthCheckResult:
    def __init__(self, name: str, status: str, message: str = "", latency_ms: float = 0, details: Dict = None):
        self.name = name
        self.status = status  # "healthy", "unhealthy", "degraded"
        self.message = message
        self.latency_ms = latency_ms
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()

class HealthChecker:
    def __init__(self, service_name: str, project_id: str):
        self.service_name = service_name
        self.project_id = project_id
        self.secret_client = None
        self.pubsub_publisher = None
        self.firestore_client = None
        
    async def check_firebase_connection(self) -> HealthCheckResult:
        """Check Firebase Firestore connection"""
        start_time = time.time()
        try:
            if not self.firestore_client:
                self.firestore_client = firestore.client()
            
            # Test read operation
            doc_ref = self.firestore_client.collection('health_check').document('test')
            await asyncio.get_event_loop().run_in_executor(None, doc_ref.get)
            
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "firebase_firestore",
                "healthy",
                "Firestore connection successful",
                latency,
                {"project_id": self.project_id}
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "firebase_firestore",
                "unhealthy",
                f"Firestore connection failed: {str(e)}",
                latency
            )

    async def check_secret_manager(self) -> HealthCheckResult:
        """Check Google Secret Manager access"""
        start_time = time.time()
        try:
            if not self.secret_client:
                self.secret_client = secretmanager.SecretManagerServiceClient()
            
            # Test access to a known secret
            secret_name = f"projects/{self.project_id}/secrets/firebase-service-account/versions/latest"
            await asyncio.get_event_loop().run_in_executor(
                None, 
                self.secret_client.access_secret_version,
                {"name": secret_name}
            )
            
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "secret_manager",
                "healthy",
                "Secret Manager access successful",
                latency
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "secret_manager",
                "unhealthy",
                f"Secret Manager access failed: {str(e)}",
                latency
            )

    async def check_pubsub_connection(self) -> HealthCheckResult:
        """Check Cloud Pub/Sub connection"""
        start_time = time.time()
        try:
            if not self.pubsub_publisher:
                self.pubsub_publisher = pubsub_v1.PublisherClient()
            
            # Test topic existence
            topic_path = self.pubsub_publisher.topic_path(self.project_id, "user-events")
            await asyncio.get_event_loop().run_in_executor(
                None,
                self.pubsub_publisher.get_topic,
                {"topic": topic_path}
            )
            
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "pubsub",
                "healthy",
                "Pub/Sub connection successful",
                latency,
                {"topic": "user-events"}
            )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                "pubsub",
                "degraded" if "not found" in str(e).lower() else "unhealthy",
                f"Pub/Sub connection issue: {str(e)}",
                latency
            )

    async def check_external_service(self, service_url: str, service_name: str, timeout: int = 5) -> HealthCheckResult:
        """Check external service health"""
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(f"{service_url}/health")
                latency = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    return HealthCheckResult(
                        f"external_{service_name}",
                        "healthy",
                        f"{service_name} service responding",
                        latency,
                        {"status_code": response.status_code, "url": service_url}
                    )
                else:
                    return HealthCheckResult(
                        f"external_{service_name}",
                        "degraded",
                        f"{service_name} returned status {response.status_code}",
                        latency,
                        {"status_code": response.status_code}
                    )
        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return HealthCheckResult(
                f"external_{service_name}",
                "unhealthy",
                f"{service_name} connection failed: {str(e)}",
                latency
            )

    async def check_memory_usage(self) -> HealthCheckResult:
        """Check memory usage"""
        try:
            import psutil
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            
            status = "healthy"
            if memory.percent > 90 or cpu_percent > 90:
                status = "unhealthy"
            elif memory.percent > 80 or cpu_percent > 80:
                status = "degraded"
            
            return HealthCheckResult(
                "system_resources",
                status,
                f"Memory: {memory.percent:.1f}%, CPU: {cpu_percent:.1f}%",
                0,
                {
                    "memory_percent": memory.percent,
                    "cpu_percent": cpu_percent,
                    "memory_available_gb": memory.available / (1024**3)
                }
            )
        except Exception as e:
            return HealthCheckResult(
                "system_resources",
                "degraded",
                f"Could not check system resources: {str(e)}",
                0
            )

    async def run_comprehensive_health_check(self, external_services: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Run all health checks and return comprehensive status"""
        checks = []
        
        # Core dependency checks
        checks.append(await self.check_firebase_connection())
        checks.append(await self.check_secret_manager())
        checks.append(await self.check_pubsub_connection())
        checks.append(await self.check_memory_usage())
        
        # External service checks
        if external_services:
            for service in external_services:
                checks.append(await self.check_external_service(
                    service["url"], 
                    service["name"]
                ))
        
        # Determine overall status
        unhealthy_count = sum(1 for check in checks if check.status == "unhealthy")
        degraded_count = sum(1 for check in checks if check.status == "degraded")
        
        if unhealthy_count > 0:
            overall_status = "unhealthy"
        elif degraded_count > 0:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        return {
            "service": self.service_name,
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": [
                {
                    "name": check.name,
                    "status": check.status,
                    "message": check.message,
                    "latency_ms": check.latency_ms,
                    "details": check.details,
                    "timestamp": check.timestamp
                }
                for check in checks
            ],
            "summary": {
                "total_checks": len(checks),
                "healthy": sum(1 for check in checks if check.status == "healthy"),
                "degraded": degraded_count,
                "unhealthy": unhealthy_count
            }
        }

# Service-specific health check configurations
SERVICE_EXTERNAL_DEPENDENCIES = {
    "ai-engine-service": [
        {"url": "https://travaia-shared-auth-service-travaia-e1310.a.run.app", "name": "shared_auth"}
    ],
    "application-job-service": [
        {"url": "https://travaia-shared-auth-service-travaia-e1310.a.run.app", "name": "shared_auth"},
        {"url": "https://travaia-ai-engine-service-travaia-e1310.a.run.app", "name": "ai_engine"}
    ],
    "interview-session-service": [
        {"url": "https://travaia-shared-auth-service-travaia-e1310.a.run.app", "name": "shared_auth"},
        {"url": "https://travaia-ai-engine-service-travaia-e1310.a.run.app", "name": "ai_engine"}
    ],
    "api-gateway": [
        {"url": "https://travaia-user-auth-service-travaia-e1310.a.run.app", "name": "user_auth"},
        {"url": "https://travaia-ai-engine-service-travaia-e1310.a.run.app", "name": "ai_engine"},
        {"url": "https://travaia-application-job-service-travaia-e1310.a.run.app", "name": "application_job"}
    ]
}
