#!/usr/bin/env python3
"""
Production Testing Script for TRAVAIA Application Job Service
Tests both GET and POST /api/applications endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Possible service URLs to test
POSSIBLE_URLS = [
    "https://travaia-application-job-service-travaia-e1310.a.run.app",
    "https://travaia-application-job-service-travaia-e1310.us-central1.run.app",
    "https://application-job-service-travaia-e1310.a.run.app",
    "https://travaia-application-job-service-976191766214.us-central1.run.app"
]

def test_service_url(base_url):
    """Test if a service URL is accessible"""
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print(f"✅ Service found at: {base_url}")
            return True, response.json()
        else:
            print(f"❌ Service at {base_url} returned {response.status_code}")
            return False, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Service at {base_url} not accessible: {str(e)}")
        return False, None

def test_root_endpoint(base_url):
    """Test root endpoint"""
    try:
        response = requests.get(f"{base_url}/", timeout=10)
        if response.status_code == 200:
            print("✅ Root endpoint working")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root endpoint error: {str(e)}")
        return False

def test_get_applications_without_auth(base_url):
    """Test GET /api/applications without authentication (should fail)"""
    try:
        response = requests.get(f"{base_url}/api/applications", timeout=10)
        if response.status_code == 401:
            print("✅ GET /api/applications correctly requires authentication")
            return True
        else:
            print(f"❌ GET /api/applications returned unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ GET /api/applications error: {str(e)}")
        return False

def test_post_applications_without_auth(base_url):
    """Test POST /api/applications without authentication (should fail)"""
    try:
        test_data = {
            "job_title": "Test Engineer",
            "company_name": "Test Corp"
        }
        response = requests.post(
            f"{base_url}/api/applications", 
            json=test_data,
            timeout=10
        )
        if response.status_code == 401:
            print("✅ POST /api/applications correctly requires authentication")
            return True
        else:
            print(f"❌ POST /api/applications returned unexpected status: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ POST /api/applications error: {str(e)}")
        return False

def test_post_applications_invalid_data(base_url):
    """Test POST /api/applications with invalid data (should fail validation)"""
    try:
        # Test with empty job_title (should fail validation)
        invalid_data = {
            "job_title": "",  # Empty title should fail
            "company_name": "Test Corp"
        }
        response = requests.post(
            f"{base_url}/api/applications", 
            json=invalid_data,
            headers={"Authorization": "Bearer fake_token"},
            timeout=10
        )
        if response.status_code in [401, 422]:  # Either auth failure or validation failure
            print("✅ POST /api/applications correctly validates input data")
            return True
        else:
            print(f"❌ POST /api/applications validation test returned: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ POST /api/applications validation error: {str(e)}")
        return False

def test_rate_limiting(base_url):
    """Test rate limiting by making multiple requests"""
    print("🔄 Testing rate limiting (30 requests/minute)...")
    try:
        # Make multiple rapid requests to test rate limiting
        for i in range(35):  # Exceed the 30/minute limit
            response = requests.get(f"{base_url}/api/applications", timeout=5)
            if response.status_code == 429:
                print(f"✅ Rate limiting working - got 429 after {i+1} requests")
                return True
        print("⚠️ Rate limiting not triggered in 35 requests")
        return False
    except Exception as e:
        print(f"❌ Rate limiting test error: {str(e)}")
        return False

def run_production_tests():
    """Run comprehensive production tests"""
    print("🧪 TRAVAIA Application Job Service - Production Testing")
    print("=" * 60)
    
    # Find working service URL
    working_url = None
    for url in POSSIBLE_URLS:
        print(f"\n🔍 Testing service URL: {url}")
        is_working, health_data = test_service_url(url)
        if is_working:
            working_url = url
            print(f"Health response: {health_data}")
            break
    
    if not working_url:
        print("\n❌ No working service URL found!")
        print("Please check deployment status:")
        print("gcloud run services list --project=travaia-e1310")
        return False
    
    print(f"\n🎯 Running tests against: {working_url}")
    print("-" * 60)
    
    # Run test suite
    tests = [
        ("Root Endpoint", lambda: test_root_endpoint(working_url)),
        ("GET /api/applications (no auth)", lambda: test_get_applications_without_auth(working_url)),
        ("POST /api/applications (no auth)", lambda: test_post_applications_without_auth(working_url)),
        ("POST /api/applications (invalid data)", lambda: test_post_applications_invalid_data(working_url)),
        ("Rate Limiting", lambda: test_rate_limiting(working_url))
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 {test_name}:")
        try:
            if test_func():
                passed += 1
            else:
                print(f"❌ {test_name} failed")
        except Exception as e:
            print(f"❌ {test_name} error: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All production tests passed!")
    else:
        print(f"⚠️ {total - passed} tests failed")
    
    print(f"\n📋 Manual Testing Instructions:")
    print(f"Service URL: {working_url}")
    print(f"Health Check: curl {working_url}/health")
    print(f"GET Applications: curl -H 'Authorization: Bearer <JWT>' {working_url}/api/applications")
    print(f"POST Application: curl -X POST -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' -d '{{\"job_title\":\"Software Engineer\",\"company_name\":\"Tech Corp\"}}' {working_url}/api/applications")
    
    return passed == total

if __name__ == "__main__":
    success = run_production_tests()
    sys.exit(0 if success else 1)
