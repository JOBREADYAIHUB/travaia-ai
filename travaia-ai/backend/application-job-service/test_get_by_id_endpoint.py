#!/usr/bin/env python3
"""
Test script for GET /api/applications/{application_id} endpoint
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
        from fastapi import FastAPI, HTTPException, Depends, Request, Query
        from fastapi.responses import JSONResponse
        from slowapi import Limiter, _rate_limit_exceeded_handler
        from slowapi.util import get_remote_address
        from slowapi.errors import RateLimitExceeded
        from slowapi.middleware import SlowAPIMiddleware
        print("✅ FastAPI and SlowAPI imports successful")
        
        from shared.auth_middleware import get_current_user
        print("✅ Auth middleware import successful")
        
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_pydantic_models():
    """Test Pydantic model creation"""
    try:
        # Test ApiResponse model
        response = ApiResponse(
            success=True,
            message="Test message",
            data={"test": "data"}
        )
        print(f"✅ ApiResponse model works: {response.success}")
        
        # Test Application model
        app = Application(
            job_title="Software Engineer",
            company_name="Test Company",
            status="applied"
        )
        print(f"✅ Application model works: {app.job_title}")
        
        return True
    except Exception as e:
        print(f"❌ Pydantic model error: {e}")
        return False

async def test_service_method():
    """Test the get_application_by_id service method"""
    try:
        service = ApplicationService()
        print("✅ ApplicationService instantiated successfully")
        
        # Test with non-existent application (should return None)
        result = await service.get_application_by_id(
            user_id="test_user_123",
            application_id="non_existent_id"
        )
        
        if result is None:
            print("✅ Service method correctly returns None for non-existent application")
        else:
            print(f"⚠️  Service method returned: {result}")
        
        return True
    except Exception as e:
        print(f"❌ Service method error: {e}")
        return False

def test_endpoint_registration():
    """Test that the endpoint is properly registered"""
    try:
        from main import app
        
        # Check if the route exists
        routes = [route.path for route in app.routes]
        expected_route = "/api/applications/{application_id}"
        
        if expected_route in routes:
            print("✅ GET /api/applications/{application_id} endpoint is registered")
        else:
            print(f"❌ Expected route not found. Available routes: {routes}")
            return False
        
        # Check for the specific endpoint function
        for route in app.routes:
            if hasattr(route, 'path') and route.path == expected_route:
                if hasattr(route, 'endpoint'):
                    print(f"✅ Endpoint function found: {route.endpoint.__name__}")
                break
        
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
        method = getattr(service, 'get_application_by_id')
        
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

async def main():
    """Run all tests"""
    print("🧪 Testing GET /api/applications/{application_id} endpoint implementation")
    print("=" * 70)
    
    tests = [
        ("Import Tests", test_imports),
        ("Pydantic Models", test_pydantic_models),
        ("Method Signature", test_method_signature),
        ("Endpoint Registration", test_endpoint_registration),
        ("Service Method", test_service_method),
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
    print("\n" + "=" * 70)
    print("📋 TEST SUMMARY")
    print("=" * 70)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! The GET /api/applications/{application_id} endpoint is ready!")
        print("\n📝 Next steps:")
        print("   1. Deploy the service to test in production")
        print("   2. Test with real JWT tokens")
        print("   3. Validate with actual Firestore data")
    else:
        print(f"\n⚠️  {len(results) - passed} test(s) failed. Please review the implementation.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
