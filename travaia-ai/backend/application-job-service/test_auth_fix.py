#!/usr/bin/env python3
"""
Test authentication fix - verify endpoints return 401 instead of 403
"""

import requests
import json

SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

def test_authentication_endpoints():
    """Test all CRUD endpoints for proper 401 authentication responses"""
    print("🔐 Testing Authentication Fix (should return 401, not 403)")
    print("=" * 60)
    
    endpoints = [
        ("GET", "/api/applications"),
        ("POST", "/api/applications", {"job_title": "Test", "company_name": "Test"}),
        ("GET", "/api/applications/test-id"),
        ("PUT", "/api/applications/test-id", {"job_title": "Updated"}),
        ("DELETE", "/api/applications/test-id")
    ]
    
    all_correct = True
    
    for method, endpoint, *data in endpoints:
        try:
            payload = data[0] if data else None
            
            if method == "GET":
                response = requests.get(f"{SERVICE_URL}{endpoint}", timeout=10)
            elif method == "POST":
                response = requests.post(f"{SERVICE_URL}{endpoint}", json=payload, timeout=10)
            elif method == "PUT":
                response = requests.put(f"{SERVICE_URL}{endpoint}", json=payload, timeout=10)
            elif method == "DELETE":
                response = requests.delete(f"{SERVICE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 401:
                print(f"✅ {method} {endpoint} -> 401 (Correct)")
            elif response.status_code == 403:
                print(f"❌ {method} {endpoint} -> 403 (Still broken)")
                all_correct = False
            else:
                print(f"⚠️  {method} {endpoint} -> {response.status_code} (Unexpected)")
                all_correct = False
            
            # Show response details
            try:
                data = response.json()
                if "detail" in data:
                    print(f"   Detail: {data['detail']}")
            except:
                pass
                
        except Exception as e:
            print(f"❌ {method} {endpoint} -> ERROR: {str(e)}")
            all_correct = False
    
    print("\n" + "=" * 60)
    if all_correct:
        print("🎉 SUCCESS: All endpoints now return 401 (authentication fixed!)")
    else:
        print("❌ ISSUE: Some endpoints still not returning 401")
    
    return all_correct

def test_health_endpoints():
    """Test health endpoints still work"""
    print("\n🏥 Health Check Verification")
    print("-" * 30)
    
    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ /health -> 200 OK")
        else:
            print(f"❌ /health -> {response.status_code}")
    except Exception as e:
        print(f"❌ /health -> ERROR: {str(e)}")

def main():
    print(f"🧪 TRAVAIA Authentication Fix Test")
    print(f"Service: {SERVICE_URL}")
    print()
    
    test_health_endpoints()
    success = test_authentication_endpoints()
    
    print(f"\n📋 Test Summary:")
    if success:
        print("✅ Authentication middleware fixed - all endpoints return 401")
        print("✅ Service ready for authenticated testing")
    else:
        print("❌ Authentication issues still present")
    
    return success

if __name__ == "__main__":
    main()
