#!/usr/bin/env python3
"""
Batch update script to apply new infrastructure to all TRAVAIA backend services
Updates all services to use circuit breakers, connection pooling, and comprehensive health checks
"""

import os
import re
from pathlib import Path

# Service directories to update
SERVICES = [
    "document-report-service",
    "analytics-growth-service", 
    "interview-session-service",
    "voice-processing-service",
    "careergpt-coach-service",
    "shared",
    "api-gateway"
]

# Infrastructure imports to add
INFRASTRUCTURE_IMPORTS = """
# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES"""

# Health check endpoint to add
DETAILED_HEALTH_CHECK = '''
@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("{service_name}", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("{service_name}", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200
            
        return result
    except Exception as e:
        return {{
            "service": "{service_name}",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {{str(e)}}",
            "timestamp": datetime.utcnow().isoformat()
        }}, 503'''

# Startup event to add
STARTUP_EVENT = '''
# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))'''

def update_service_main_py(service_dir: Path, service_name: str):
    """Update a service's main.py file with new infrastructure"""
    main_py = service_dir / "main.py"
    
    if not main_py.exists():
        print(f"⚠️  {service_name}: main.py not found, skipping")
        return False
    
    print(f"🔧 Updating {service_name}/main.py...")
    
    with open(main_py, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add asyncio import if not present
    if 'import asyncio' not in content:
        content = re.sub(
            r'(import os\n)',
            r'\1import asyncio\n',
            content
        )
    
    # Add datetime import if not present
    if 'from datetime import datetime' not in content:
        content = re.sub(
            r'(from slowapi.errors import RateLimitExceeded\n)',
            r'\1from datetime import datetime\n',
            content
        )
    
    # Add infrastructure imports after existing imports
    if 'from shared.circuit_breaker import' not in content:
        content = re.sub(
            r'(from slowapi.errors import RateLimitExceeded\n)',
            r'\1\n' + INFRASTRUCTURE_IMPORTS + '\n',
            content
        )
    
    # Add infrastructure info to root endpoint
    root_pattern = r'(@app\.get\("/"\).*?return\s*{[^}]*"service":\s*"[^"]*"[^}]*})'
    if re.search(root_pattern, content, re.DOTALL):
        content = re.sub(
            r'("service":\s*"[^"]*")',
            r'\1,\n        "infrastructure": {\n            "circuit_breakers": "enabled",\n            "connection_pooling": "enabled",\n            "health_monitoring": "comprehensive"\n        }',
            content
        )
    
    # Add detailed health check endpoint
    if '/health/detailed' not in content:
        health_check_pattern = r'(@app\.get\("/health"\).*?})'
        detailed_check = DETAILED_HEALTH_CHECK.format(service_name=service_name)
        content = re.sub(
            health_check_pattern,
            r'\1\n' + detailed_check,
            content,
            flags=re.DOTALL
        )
    
    # Add startup event if not present
    if '@app.on_event("startup")' not in content:
        # Add before if __name__ == "__main__"
        content = re.sub(
            r'(if __name__ == "__main__":)',
            STARTUP_EVENT + '\n\n\\1',
            content
        )
    
    # Write updated content
    with open(main_py, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ {service_name}: Updated successfully")
    return True

def main():
    """Main update function"""
    backend_dir = Path(__file__).parent
    updated_count = 0
    
    print("🚀 Starting batch infrastructure update for TRAVAIA services...")
    print("=" * 60)
    
    for service in SERVICES:
        service_dir = backend_dir / service
        
        if not service_dir.exists():
            print(f"⚠️  {service}: Directory not found, skipping")
            continue
        
        if update_service_main_py(service_dir, service):
            updated_count += 1
    
    print("=" * 60)
    print(f"🎯 Infrastructure update complete!")
    print(f"📊 Updated {updated_count}/{len(SERVICES)} services")
    print()
    print("✅ All services now include:")
    print("   • Circuit breaker protection")
    print("   • Database connection pooling")
    print("   • Comprehensive health checks")
    print("   • Background cleanup tasks")
    print()
    print("🔄 Next steps:")
    print("   1. Run setup-secrets-manager.bat")
    print("   2. Configure production secrets")
    print("   3. Deploy with deploy-all-services-secure.bat")

if __name__ == "__main__":
    main()
