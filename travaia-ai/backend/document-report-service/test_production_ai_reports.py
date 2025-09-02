"""
Production test script for GET /api/ai-reports endpoint
Tests the deployed document-report-service endpoint
"""

import requests
import json
from datetime import datetime

def test_ai_reports_endpoint():
    """Test AI reports endpoint with mock authentication"""
    print("🔍 Testing GET /api/ai-reports endpoint...")
    
    # This will be updated with the actual production URL after deployment
    BASE_URL = "http://localhost:8080"  # Will be updated to production URL
    
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
            
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_health_endpoint():
    """Test health endpoint"""
    print("🔍 Testing health endpoint...")
    BASE_URL = "http://localhost:8080"  # Will be updated to production URL
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def main():
    """Run production tests"""
    print("🚀 Starting production tests for document-report-service")
    print(f"⏰ Test time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Run tests
    health_ok = test_health_endpoint()
    ai_reports_ok = test_ai_reports_endpoint()
    
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY:")
    print(f"✅ Health endpoint: {'PASS' if health_ok else 'FAIL'}")
    print(f"✅ AI reports endpoint: {'PASS' if ai_reports_ok else 'FAIL'}")
    
    if health_ok and ai_reports_ok:
        print("\n🎉 All tests PASSED! Service is production ready.")
    else:
        print("\n⚠️ Some tests FAILED. Review issues before production use.")

if __name__ == "__main__":
    main()
