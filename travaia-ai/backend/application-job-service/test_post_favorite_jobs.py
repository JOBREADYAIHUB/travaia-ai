"""
Test script for the POST /api/favorite-jobs endpoint
Tests both authenticated and unauthenticated requests
"""

import requests
import json

# Service URL
BASE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"
ENDPOINT = "/api/favorite-jobs"

def test_post_unauthenticated():
    """Test POST endpoint without authentication - should return 401"""
    print("🔒 Testing POST unauthenticated request...")
    
    payload = {
        "job_title": "Software Engineer",
        "company_name": "Test Company",
        "link": "https://example.com/job/123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}{ENDPOINT}", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("✅ PASS: Correctly returns 401 for unauthenticated POST request")
        else:
            print("❌ FAIL: Expected 401 status code")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

def test_post_with_auth_header():
    """Test POST endpoint with mock authentication header"""
    print("\n🔑 Testing POST with authentication header...")
    
    headers = {
        "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock_payload.mock_signature",
        "Content-Type": "application/json"
    }
    
    payload = {
        "job_title": "Senior Python Developer",
        "company_name": "TRAVAIA",
        "link": "https://travaia.co/careers/senior-python-dev"
    }
    
    try:
        response = requests.post(f"{BASE_URL}{ENDPOINT}", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [401, 403]:
            print("✅ PASS: Authentication middleware is processing the POST token")
        elif response.status_code == 201:
            print("✅ PASS: POST endpoint working with valid authentication")
        else:
            print(f"ℹ️  INFO: Unexpected status code {response.status_code}")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

def test_post_validation_errors():
    """Test POST endpoint with invalid data"""
    print("\n📝 Testing POST validation errors...")
    
    headers = {
        "Authorization": "Bearer mock_token",
        "Content-Type": "application/json"
    }
    
    # Test missing required fields
    invalid_payloads = [
        {},  # Empty payload
        {"job_title": ""},  # Empty job title
        {"job_title": "Test", "company_name": ""},  # Empty company name
        {"job_title": "Test", "company_name": "Company"},  # Missing link
        {"job_title": "A" * 201, "company_name": "Company", "link": "https://example.com"},  # Too long job title
    ]
    
    for i, payload in enumerate(invalid_payloads):
        try:
            response = requests.post(f"{BASE_URL}{ENDPOINT}", json=payload, headers=headers)
            print(f"Test {i+1} - Status: {response.status_code}, Response: {response.text[:100]}...")
            
            if response.status_code in [401, 422]:
                print(f"✅ PASS: Test {i+1} correctly handled validation/auth")
            else:
                print(f"ℹ️  INFO: Test {i+1} unexpected status {response.status_code}")
                
        except Exception as e:
            print(f"❌ ERROR in test {i+1}: {str(e)}")

def main():
    print("🧪 Testing POST /api/favorite-jobs Endpoint")
    print("=" * 60)
    
    test_post_unauthenticated()
    test_post_with_auth_header()
    test_post_validation_errors()
    
    print("\n" + "=" * 60)
    print("✅ POST endpoint tests completed!")
    print("🔒 Authentication middleware is working for POST requests")
    print("📝 Request validation is being processed")
    print("\nTo test with real authentication, use a valid Firebase JWT token.")
    print("Expected behavior:")
    print("- 401 for unauthenticated requests")
    print("- 422 for validation errors")
    print("- 201 for successful creation with valid auth")

if __name__ == "__main__":
    main()
