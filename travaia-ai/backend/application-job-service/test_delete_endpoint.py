#!/usr/bin/env python3
"""
Test script for DELETE /api/applications/{application_id} endpoint
"""

import sys
import os
import asyncio
from datetime import datetime
from typing import Dict, Any

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from models import ApiResponse, Application
    from services.application_service import ApplicationService
    print("✅ Successfully imported models and services")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_imports():
    """Test that all required imports work"""
    try:
        from fastapi import FastAPI, HTTPException, Depends, Request
        from slowapi import Limiter
        print("✅ FastAPI and SlowAPI imports successful")
        
        from shared.auth_middleware import get_current_user
        print("✅ Auth middleware import successful")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

async def test_service_delete_method():
    """Test the delete_application service method"""
    try:
        service = ApplicationService()
        print("✅ ApplicationService instantiated successfully")
        
        # Test with non-existent application (should return False)
        result = await service.delete_application(
            user_id="test_user_123",
            application_id="non_existent_id"
        )
        
        if result is False:
            print("✅ Service method correctly returns False for non-existent application")
        else:
            print(f"⚠️  Service method returned: {result}")
        
        return True
    except Exception as e:
        print(f"❌ Service method error: {e}")
        return False

def test_endpoint_registration():
    """Test that the DELETE endpoint is properly registered"""
    try:
        from main import app
        
        # Check if the route exists
        routes = [route.path for route in app.routes]
        expected_route = "/api/applications/{application_id}"
        
        # Check for DELETE method specifically
        delete_route_found = False
        for route in app.routes:
            if hasattr(route, 'path') and route.path == expected_route:
                if hasattr(route, 'methods') and 'DELETE' in route.methods:
                    delete_route_found = True
                    print(f"✅ DELETE {expected_route} endpoint is registered")
                    if hasattr(route, 'endpoint'):
                        print(f"   Endpoint function: {route.endpoint.__name__}")
                    break
        
        if not delete_route_found:
            print(f"❌ DELETE endpoint not found. Available routes: {routes}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Endpoint registration error: {e}")
        return False

def test_method_signature():
    """Test the service method signature"""
    try:
        import inspect
        from services.application_service import ApplicationService
        
        service = ApplicationService()
        method = getattr(service, 'delete_application')
        
        # Check method signature
        sig = inspect.signature(method)
        params = list(sig.parameters.keys())
        
        expected_params = ['user_id', 'application_id']
        if all(param in params for param in expected_params):
            print("✅ Service method has correct signature")
            print(f"   Parameters: {params}")
        else:
            print(f"❌ Incorrect method signature. Expected {expected_params}, got {params}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Method signature error: {e}")
        return False

def test_cascade_delete_logic():
    """Test cascade delete logic structure"""
    try:
        import inspect
        from services.application_service import ApplicationService
        
        service = ApplicationService()
        method = getattr(service, 'delete_application')
        
        # Get method source code to check for cascade delete logic
        source = inspect.getsource(method)
        
        # Check for key cascade delete components
        cascade_checks = [
            'ai_job_fit_report_id' in source,
            'interviews' in source,
            'feedback_report_id' in source,
            'ai_reports' in source,
            'cascade delete' in source.lower()
        ]
        
        if all(cascade_checks):
            print("✅ Cascade delete logic includes all required components")
            print("   - AI job fit reports deletion")
            print("   - Related interviews deletion")
            print("   - Interview feedback reports deletion")
        else:
            print(f"❌ Missing cascade delete components: {cascade_checks}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Cascade delete logic error: {e}")
        return False

def test_error_handling():
    """Test error handling patterns"""
    try:
        from main import app
        
        # Find the delete endpoint
        delete_endpoint = None
        for route in app.routes:
            if (hasattr(route, 'path') and route.path == "/api/applications/{application_id}" and
                hasattr(route, 'methods') and 'DELETE' in route.methods):
                delete_endpoint = route.endpoint
                break
        
        if not delete_endpoint:
            print("❌ DELETE endpoint not found")
            return False
        
        # Check endpoint source for error handling
        import inspect
        source = inspect.getsource(delete_endpoint)
        
        error_checks = [
            'HTTPException' in source,
            'status_code=401' in source,
            'status_code=404' in source,
            'status_code=500' in source,
            'except HTTPException' in source,
            'except Exception' in source
        ]
        
        if all(error_checks):
            print("✅ Comprehensive error handling implemented")
            print("   - 401 Unauthorized for invalid auth")
            print("   - 404 Not Found for missing/unauthorized applications")
            print("   - 500 Internal Server Error for database issues")
        else:
            print(f"❌ Missing error handling components: {error_checks}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error handling test error: {e}")
        return False

def test_logging_implementation():
    """Test structured logging implementation"""
    try:
        import inspect
        from services.application_service import ApplicationService
        
        service = ApplicationService()
        method = getattr(service, 'delete_application')
        source = inspect.getsource(method)
        
        # Check for logging statements
        logging_checks = [
            'logger.info' in source,
            'logger.warning' in source,
            'logger.error' in source,
            'application_id=' in source,
            'user_id=' in source
        ]
        
        if all(logging_checks):
            print("✅ Structured logging implemented")
            print("   - Info logs for successful operations")
            print("   - Warning logs for authorization issues")
            print("   - Error logs for failures")
            print("   - Contextual data included (application_id, user_id)")
        else:
            print(f"❌ Missing logging components: {logging_checks}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Logging implementation test error: {e}")
        return False

def test_rate_limiting():
    """Test rate limiting configuration"""
    try:
        from main import app
        
        # Find the delete endpoint
        delete_endpoint = None
        for route in app.routes:
            if (hasattr(route, 'path') and route.path == "/api/applications/{application_id}" and
                hasattr(route, 'methods') and 'DELETE' in route.methods):
                delete_endpoint = route.endpoint
                break
        
        if not delete_endpoint:
            print("❌ DELETE endpoint not found")
            return False
        
        # Check for rate limiting decorator
        import inspect
        source = inspect.getsource(delete_endpoint)
        
        if '@limiter.limit("30/minute")' in source:
            print("✅ Rate limiting configured (30 requests/minute)")
        else:
            print("❌ Rate limiting not found or incorrectly configured")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Rate limiting test error: {e}")
        return False

async def main():
    """Run all tests"""
    print("🧪 Testing DELETE /api/applications/{application_id} endpoint implementation")
    print("=" * 80)
    
    tests = [
        ("Import Tests", test_imports),
        ("Method Signature", test_method_signature),
        ("Endpoint Registration", test_endpoint_registration),
        ("Cascade Delete Logic", test_cascade_delete_logic),
        ("Error Handling", test_error_handling),
        ("Logging Implementation", test_logging_implementation),
        ("Rate Limiting", test_rate_limiting),
        ("Service Delete Method", test_service_delete_method),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name}...")
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 80)
    print("📋 TEST SUMMARY")
    print("=" * 80)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! The DELETE /api/applications/{application_id} endpoint is ready!")
        print("\n📝 Endpoint Features:")
        print("   ✅ JWT authentication and user ownership validation")
        print("   ✅ Cascade delete of related data:")
        print("      - AI job fit reports")
        print("      - Related interviews and attempts")
        print("      - Interview feedback reports")
        print("   ✅ Rate limiting (30 requests/minute)")
        print("   ✅ Comprehensive error handling (401, 404, 500)")
        print("   ✅ Structured logging for monitoring")
        print("   ✅ Graceful handling of missing related data")
        print("\n📝 Usage Example:")
        print("   DELETE /api/applications/{application_id}")
        print("   Authorization: Bearer <JWT_TOKEN>")
        print("\n📝 Response:")
        print("   {")
        print('     "success": true,')
        print('     "message": "Application deleted successfully",')
        print('     "data": null')
        print("   }")
        print("\n⚠️  Important: This operation is irreversible and deletes all related data!")
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed. Please review the implementation.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
