"""
Production test script for GET /api/ai-reports endpoint
Tests the deployed document-report-service endpoints
"""

import requests
import json
from datetime import datetime

# Production service URL
BASE_URL = "https://travaia-document-report-service-976191766214.us-central1.run.app"

def test_health_endpoint():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_ai_reports_endpoint():
    """Test AI reports endpoint with mock authentication"""
    print("\n🔍 Testing GET /api/ai-reports endpoint...")
    
    # Mock JWT token for testing
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    # Test parameters
    params = {
        "page": 1,
        "limit": 10
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/ai-reports",
            headers=headers,
            params=params,
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ AI reports endpoint working!")
            print(f"📄 Response structure:")
            print(f"  - Success: {data.get('success')}")
            print(f"  - Message: {data.get('message')}")
            print(f"  - Data keys: {list(data.get('data', {}).keys())}")
            print(f"  - Pagination: {data.get('pagination')}")
            print(f"  - Timestamp: {data.get('timestamp')}")
            
            # Check if reports data is present
            reports = data.get('data', {}).get('reports', [])
            print(f"  - Number of reports: {len(reports)}")
            
            if reports:
                print(f"  - First report structure: {list(reports[0].keys())}")
                print(f"  - First report content keys: {list(reports[0].get('content', {}).keys())}")
            
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_pagination():
    """Test pagination parameters"""
    print("\n🔍 Testing pagination...")
    
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    # Test different pagination parameters
    test_cases = [
        {"page": 1, "limit": 5},
        {"page": 2, "limit": 2},
        {"page": 1, "limit": 100},  # Max limit
    ]
    
    for i, params in enumerate(test_cases):
        try:
            response = requests.get(
                f"{BASE_URL}/api/ai-reports",
                headers=headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                pagination = data.get('pagination', {})
                print(f"✅ Test case {i+1}: page={params['page']}, limit={params['limit']}")
                print(f"   Pagination: page={pagination.get('page')}, limit={pagination.get('limit')}, total={pagination.get('total')}")
            else:
                print(f"❌ Test case {i+1} failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Test case {i+1} error: {e}")

def test_authentication():
    """Test authentication requirements"""
    print("\n🔍 Testing authentication...")
    
    # Test without authorization header
    try:
        response = requests.get(
            f"{BASE_URL}/api/ai-reports",
            params={"page": 1, "limit": 10},
            timeout=10
        )
        
        if response.status_code == 401:
            print("✅ Unauthenticated request properly rejected (401)")
        else:
            print(f"⚠️ Expected 401, got {response.status_code}")
            
    except Exception as e:
        print(f"❌ Authentication test error: {e}")

def test_validation():
    """Test parameter validation"""
    print("\n🔍 Testing parameter validation...")
    
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    # Test invalid parameters
    test_cases = [
        {"page": 0, "limit": 10, "expected": 422},  # Invalid page
        {"page": 1, "limit": 0, "expected": 422},   # Invalid limit
        {"page": 1, "limit": 101, "expected": 422}, # Limit too high
    ]
    
    for i, case in enumerate(test_cases):
        try:
            response = requests.get(
                f"{BASE_URL}/api/ai-reports",
                headers=headers,
                params={"page": case["page"], "limit": case["limit"]},
                timeout=10
            )
            
            if response.status_code == case["expected"]:
                print(f"✅ Validation test {i+1}: Correctly rejected invalid params")
            else:
                print(f"⚠️ Validation test {i+1}: Expected {case['expected']}, got {response.status_code}")
                
        except Exception as e:
            print(f"❌ Validation test {i+1} error: {e}")

def main():
    """Run all production tests"""
    print("🚀 Starting production tests for document-report-service")
    print(f"🌐 Service URL: {BASE_URL}")
    print(f"⏰ Test time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Run tests
    health_ok = test_health_endpoint()
    ai_reports_ok = test_ai_reports_endpoint()
    
    # Additional tests
    test_pagination()
    test_authentication()
    test_validation()
    
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY:")
    print(f"✅ Health endpoint: {'PASS' if health_ok else 'FAIL'}")
    print(f"✅ AI reports endpoint: {'PASS' if ai_reports_ok else 'FAIL'}")
    
    if health_ok and ai_reports_ok:
        print("\n🎉 All critical tests PASSED! Service is production ready.")
        print(f"📡 Production URL: {BASE_URL}/api/ai-reports")
    else:
        print("\n⚠️ Some tests FAILED. Review issues before production use.")

if __name__ == "__main__":
    main()
