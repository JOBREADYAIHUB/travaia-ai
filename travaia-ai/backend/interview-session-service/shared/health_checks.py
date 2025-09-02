"""
Simplified health checks for interview-session-service
"""

from typing import Dict, Any

# Mock health checker
class HealthChecker:
    @staticmethod
    async def check_all_dependencies() -> Dict[str, Any]:
        """Mock health check"""
        return {
            "database": "healthy",
            "external_apis": "healthy"
        }

# Mock service dependencies
SERVICE_EXTERNAL_DEPENDENCIES = {
    "firestore": "healthy",
    "pubsub": "healthy"
}
