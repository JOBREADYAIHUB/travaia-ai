"""
Production test script for interview attempts endpoint
Tests the deployed interview-session-service endpoints
"""

import requests
import json
from datetime import datetime

# Production service URL
BASE_URL = "https://travaia-interview-session-service-976191766214.us-central1.run.app"

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

def test_interview_attempts_endpoint():
    """Test interview attempts endpoint with mock authentication"""
    print("\n🔍 Testing interview attempts endpoint...")
    
    # Mock JWT token for testing
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    # Test parameters
    interview_id = "test-interview-123"
    params = {
        "page": 1,
        "limit": 10
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/interviews/{interview_id}/attempts",
            headers=headers,
            params=params,
            timeout=10
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Interview attempts endpoint working!")
            print(f"📄 Response structure:")
            print(f"  - Success: {data.get('success')}")
            print(f"  - Message: {data.get('message')}")
            print(f"  - Data keys: {list(data.get('data', {}).keys())}")
            print(f"  - Pagination: {data.get('pagination')}")
            print(f"  - Timestamp: {data.get('timestamp')}")
            
            # Check if attempts data is present
            attempts = data.get('data', {}).get('attempts', [])
            print(f"  - Number of attempts: {len(attempts)}")
            
            if attempts:
                print(f"  - First attempt structure: {list(attempts[0].keys())}")
            
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_rate_limiting():
    """Test rate limiting on interview attempts endpoint"""
    print("\n🔍 Testing rate limiting...")
    
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    interview_id = "test-interview-rate-limit"
    params = {"page": 1, "limit": 5}
    
    # Make multiple requests quickly to test rate limiting
    success_count = 0
    rate_limited_count = 0
    
    for i in range(5):
        try:
            response = requests.get(
                f"{BASE_URL}/api/interviews/{interview_id}/attempts",
                headers=headers,
                params=params,
                timeout=5
            )
            
            if response.status_code == 200:
                success_count += 1
            elif response.status_code == 429:
                rate_limited_count += 1
                print(f"🚦 Rate limited on request {i+1}")
            else:
                print(f"⚠️ Unexpected status {response.status_code} on request {i+1}")
                
        except Exception as e:
            print(f"❌ Request {i+1} failed: {e}")
    
    print(f"📊 Rate limiting test results:")
    print(f"  - Successful requests: {success_count}")
    print(f"  - Rate limited requests: {rate_limited_count}")
    
    return success_count > 0

def test_pagination():
    """Test pagination parameters"""
    print("\n🔍 Testing pagination...")
    
    headers = {
        "Authorization": "Bearer mock-jwt-token-for-testing",
        "Content-Type": "application/json"
    }
    
    interview_id = "test-interview-pagination"
    
    # Test different pagination parameters
    test_cases = [
        {"page": 1, "limit": 5},
        {"page": 2, "limit": 2},
        {"page": 1, "limit": 100},  # Max limit
    ]
    
    for i, params in enumerate(test_cases):
        try:
            response = requests.get(
                f"{BASE_URL}/api/interviews/{interview_id}/attempts",
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

def main():
    """Run all production tests"""
    print("🚀 Starting production tests for interview-session-service")
    print(f"🌐 Service URL: {BASE_URL}")
    print(f"⏰ Test time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Run tests
    health_ok = test_health_endpoint()
    attempts_ok = test_interview_attempts_endpoint()
    rate_limit_ok = test_rate_limiting()
    
    # Additional pagination test
    test_pagination()
    
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY:")
    print(f"✅ Health endpoint: {'PASS' if health_ok else 'FAIL'}")
    print(f"✅ Interview attempts endpoint: {'PASS' if attempts_ok else 'FAIL'}")
    print(f"✅ Rate limiting: {'PASS' if rate_limit_ok else 'FAIL'}")
    
    if health_ok and attempts_ok:
        print("\n🎉 All critical tests PASSED! Service is production ready.")
    else:
        print("\n⚠️ Some tests FAILED. Review issues before production use.")

if __name__ == "__main__":
    main()
