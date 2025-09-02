#!/usr/bin/env python3
"""
Test script to verify DELETE endpoint authentication and rate limiting fixes
"""

import requests
import json
import time
from datetime import datetime

SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

def test_delete_authentication():
    """Test DELETE endpoint authentication (should return 401, not 404)"""
    print("🔍 Testing DELETE endpoint authentication...")
    
    try:
        response = requests.delete(f"{SERVICE_URL}/api/applications/test-id", timeout=10)
        
        if response.status_code == 401:
            print("✅ DELETE endpoint correctly returns 401 (authentication required)")
            try:
                data = response.json()
                if "detail" in data:
                    print(f"   Detail: {data['detail']}")
            except:
                pass
            return True
        elif response.status_code == 404:
            print("❌ DELETE endpoint still returns 404 instead of 401")
            return False
        else:
            print(f"❌ DELETE endpoint returns unexpected status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ DELETE endpoint test failed: {str(e)}")
        return False

def test_rate_limiting():
    """Test rate limiting by making rapid requests"""
    print("\n🔍 Testing rate limiting...")
    
    rate_limit_triggered = False
    
    try:
        # Make 35 rapid requests to trigger rate limiting (limit is 30/minute)
        for i in range(35):
            response = requests.get(f"{SERVICE_URL}/api/applications", timeout=5)
            
            if response.status_code == 429:
                print(f"✅ Rate limiting triggered after {i+1} requests (429 Too Many Requests)")
                rate_limit_triggered = True
                break
            elif response.status_code == 401:
                # Expected - authentication required
                pass
            else:
                print(f"   Request {i+1}: {response.status_code}")
            
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limit_triggered:
            return True
        else:
            print("⚠️  Rate limiting not triggered after 35 requests")
            print("   This might be normal if requests are spread over time")
            return False
            
    except Exception as e:
        print(f"❌ Rate limiting test failed: {str(e)}")
        return False

def test_all_endpoints_auth():
    """Test all CRUD endpoints for proper authentication"""
    print("\n🔍 Testing all CRUD endpoints authentication...")
    
    endpoints = [
        ("GET", "/api/applications"),
        ("POST", "/api/applications"),
        ("GET", "/api/applications/test-id"),
        ("PUT", "/api/applications/test-id"),
        ("DELETE", "/api/applications/test-id")
    ]
    
    all_passed = True
    
    for method, endpoint in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{SERVICE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{SERVICE_URL}{endpoint}", 
                                       json={"job_title": "Test", "company_name": "Test"}, 
                                       timeout=10)
            elif method == "PUT":
                response = requests.put(f"{SERVICE_URL}{endpoint}", 
                                      json={"job_title": "Updated"}, 
                                      timeout=10)
            elif method == "DELETE":
                response = requests.delete(f"{SERVICE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                print(f"✅ {method} {endpoint} -> 401 (authentication required)")
            else:
                print(f"❌ {method} {endpoint} -> {response.status_code} (expected 401)")
                all_passed = False
                
        except Exception as e:
            print(f"❌ {method} {endpoint} -> ERROR: {str(e)}")
            all_passed = False
    
    return all_passed

def main():
    """Run all fix verification tests"""
    print("🧪 TRAVAIA Application Job Service - Fix Verification")
    print("=" * 60)
    print(f"Service URL: {SERVICE_URL}")
    print(f"Test Time: {datetime.utcnow().isoformat()}Z")
    print("=" * 60)
    
    tests = [
        ("DELETE Authentication Fix", test_delete_authentication),
        ("Rate Limiting Fix", test_rate_limiting),
        ("All Endpoints Authentication", test_all_endpoints_auth)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 40)
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 FIX VERIFICATION SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All fixes verified successfully!")
        print("\n📝 Fixed Issues:")
        print("   ✅ DELETE endpoint now returns 401 (not 404) for unauthenticated requests")
        print("   ✅ Rate limiting is properly configured and working")
        print("   ✅ All CRUD endpoints enforce authentication correctly")
        print("\n🚀 Service is ready for production use!")
    else:
        print(f"\n⚠️  {len(results) - passed} issue(s) still need attention.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
