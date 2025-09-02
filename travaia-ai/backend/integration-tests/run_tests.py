#!/usr/bin/env python3
"""
TRAVAIA Integration Test Runner
"""

import asyncio
import sys
import os
from test_microservices_integration import run_integration_tests

def main():
    """Main test runner"""
    print("TRAVAIA Backend Integration Test Suite")
    print("=====================================")
    
    # Check if services are running
    print("\nChecking environment...")
    
    services = {
        "API_GATEWAY_URL": os.getenv("API_GATEWAY_URL", "http://localhost:8000"),
        "AI_ENGINE_SERVICE_URL": os.getenv("AI_ENGINE_SERVICE_URL", "http://localhost:8002"),
        "APPLICATION_JOB_SERVICE_URL": os.getenv("APPLICATION_JOB_SERVICE_URL", "http://localhost:8003"),
        "DOCUMENT_REPORT_SERVICE_URL": os.getenv("DOCUMENT_REPORT_SERVICE_URL", "http://localhost:8004"),
        "ANALYTICS_GROWTH_SERVICE_URL": os.getenv("ANALYTICS_GROWTH_SERVICE_URL", "http://localhost:8005"),
        "INTERVIEW_SESSION_SERVICE_URL": os.getenv("INTERVIEW_SESSION_SERVICE_URL", "http://localhost:8080")
    }
    
    print("\nService URLs:")
    for service, url in services.items():
        print(f"  {service}: {url}")
    
    print("\nStarting integration tests...")
    
    try:
        # Run the integration tests
        asyncio.run(run_integration_tests())
        print("\n✅ All integration tests completed successfully!")
        return 0
        
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        return 1
        
    except Exception as e:
        print(f"\n❌ Integration tests failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())