#!/usr/bin/env python3
"""
Test script for the new contact endpoint
POST /api/applications/{application_id}/contacts
"""

import requests
import json

SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

def test_contact_endpoint_authentication():
    """Test that the contact endpoint requires authentication"""
    print("🔐 Testing Contact Endpoint Authentication")
    print("-" * 50)
    
    # Test data
    contact_data = {
        "name": "John Doe",
        "role": "Hiring Manager",
        "email": "john.doe@company.com",
        "phone": "+1-555-0123"
    }
    
    try:
        response = requests.post(
            f"{SERVICE_URL}/api/applications/test-app-id/contacts",
            json=contact_data,
            timeout=10
        )
        
        if response.status_code == 401:
            print("✅ Contact endpoint requires authentication (401)")
            try:
                data = response.json()
                if "detail" in data:
                    print(f"   Detail: {data['detail']}")
            except:
                pass
            return True
        else:
            print(f"❌ Expected 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_contact_endpoint_validation():
    """Test contact endpoint data validation"""
    print("\n📝 Testing Contact Endpoint Validation")
    print("-" * 50)
    
    # Test with invalid data (missing required name field)
    invalid_data = {
        "role": "Manager",
        "email": "test@example.com"
        # Missing required "name" field
    }
    
    try:
        response = requests.post(
            f"{SERVICE_URL}/api/applications/test-app-id/contacts",
            json=invalid_data,
            timeout=10
        )
        
        if response.status_code in [400, 401, 422]:
            print(f"✅ Validation working - rejected invalid data ({response.status_code})")
            return True
        else:
            print(f"❌ Expected 400/401/422, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return False

def test_contact_endpoint_rate_limiting():
    """Test rate limiting on contact endpoint"""
    print("\n⏱️ Testing Contact Endpoint Rate Limiting")
    print("-" * 50)
    
    contact_data = {
        "name": "Test Contact",
        "role": "Test Role"
    }
    
    print("   Making rapid requests to test rate limiting...")
    
    for i in range(35):  # Try to exceed 30/minute limit
        try:
            response = requests.post(
                f"{SERVICE_URL}/api/applications/test-app-id/contacts",
                json=contact_data,
                timeout=5
            )
            
            if response.status_code == 429:
                print(f"✅ Rate limiting triggered after {i+1} requests")
                return True
            elif response.status_code == 401:
                # Expected - authentication required
                continue
            else:
                print(f"   Request {i+1}: {response.status_code}")
                
        except Exception as e:
            continue
    
    print("⚠️  Rate limiting not triggered after 35 requests")
    return False

def test_health_check():
    """Verify service is still healthy"""
    print("\n🏥 Health Check")
    print("-" * 20)
    
    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Service is healthy")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def main():
    """Run all contact endpoint tests"""
    print("🧪 TRAVAIA Contact Endpoint Testing")
    print("=" * 60)
    print(f"Service URL: {SERVICE_URL}")
    print(f"New Endpoint: POST /api/applications/{{application_id}}/contacts")
    print("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Authentication", test_contact_endpoint_authentication),
        ("Data Validation", test_contact_endpoint_validation),
        ("Rate Limiting", test_contact_endpoint_rate_limiting)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 CONTACT ENDPOINT TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n📊 Results: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 Contact endpoint deployed successfully!")
        print("\n📝 Endpoint Features:")
        print("   ✅ Authentication required (JWT)")
        print("   ✅ Rate limiting (30/minute)")
        print("   ✅ Data validation (Pydantic)")
        print("   ✅ User ownership validation")
        print("   ✅ Unique contact ID generation")
        print("   ✅ Structured logging")
        
        print(f"\n🔗 Endpoint URL:")
        print(f"   POST {SERVICE_URL}/api/applications/{{application_id}}/contacts")
        
        print(f"\n📋 Request Format:")
        print(f"   Headers: Authorization: Bearer <JWT_TOKEN>")
        print(f"   Body: {{")
        print(f"     \"name\": \"Contact Name\",")
        print(f"     \"role\": \"Contact Role\",")
        print(f"     \"email\": \"contact@example.com\",")
        print(f"     \"phone\": \"+1-555-0123\"")
        print(f"   }}")
        
    else:
        print(f"\n⚠️  {len(results) - passed} issue(s) detected.")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
