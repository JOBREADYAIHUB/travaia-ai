#!/usr/bin/env python3
"""
Debug rate limiting issue - test with different approaches
"""

import requests
import time
import json

SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

def test_rate_limiting_with_timing():
    """Test rate limiting with precise timing"""
    print("🔍 Testing Rate Limiting with Timing Analysis")
    print("-" * 50)
    
    contact_data = {
        "name": "Test Contact",
        "role": "Test Role"
    }
    
    # Make requests faster than 30/minute (more than 1 every 2 seconds)
    for i in range(40):
        start_time = time.time()
        
        try:
            response = requests.post(
                f"{SERVICE_URL}/api/applications/test-app-id/contacts",
                json=contact_data,
                timeout=3
            )
            
            elapsed = time.time() - start_time
            
            print(f"Request {i+1:2d}: {response.status_code} ({elapsed:.2f}s)")
            
            if response.status_code == 429:
                print(f"✅ Rate limiting triggered after {i+1} requests")
                try:
                    data = response.json()
                    print(f"   Detail: {data.get('detail', 'No detail')}")
                except:
                    pass
                return True
            elif response.status_code == 401:
                # Expected - authentication required
                pass
            else:
                print(f"   Unexpected status: {response.status_code}")
            
            # Very short delay to make requests rapid
            time.sleep(0.05)
            
        except Exception as e:
            print(f"Request {i+1:2d}: ERROR - {str(e)}")
            continue
    
    print("❌ Rate limiting not triggered after 40 requests")
    return False

def test_other_endpoint_rate_limiting():
    """Test rate limiting on other endpoints for comparison"""
    print("\n🔍 Testing Rate Limiting on GET /api/applications")
    print("-" * 50)
    
    for i in range(35):
        try:
            response = requests.get(
                f"{SERVICE_URL}/api/applications",
                timeout=3
            )
            
            print(f"Request {i+1:2d}: {response.status_code}")
            
            if response.status_code == 429:
                print(f"✅ Rate limiting triggered on GET endpoint after {i+1} requests")
                return True
            elif response.status_code == 401:
                # Expected - authentication required
                pass
            
            time.sleep(0.05)
            
        except Exception as e:
            print(f"Request {i+1:2d}: ERROR - {str(e)}")
            continue
    
    print("❌ Rate limiting not triggered on GET endpoint after 35 requests")
    return False

def test_rate_limiting_headers():
    """Check if rate limiting headers are present"""
    print("\n🔍 Checking Rate Limiting Headers")
    print("-" * 40)
    
    try:
        response = requests.post(
            f"{SERVICE_URL}/api/applications/test-app-id/contacts",
            json={"name": "Test"},
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print("Headers:")
        
        rate_limit_headers = [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining', 
            'X-RateLimit-Reset',
            'Retry-After'
        ]
        
        found_headers = False
        for header in rate_limit_headers:
            if header in response.headers:
                print(f"  {header}: {response.headers[header]}")
                found_headers = True
        
        if not found_headers:
            print("  No rate limiting headers found")
            
        return found_headers
        
    except Exception as e:
        print(f"Error checking headers: {str(e)}")
        return False

def main():
    """Run rate limiting debug tests"""
    print("🐛 RATE LIMITING DEBUG TESTS")
    print("=" * 60)
    print(f"Service URL: {SERVICE_URL}")
    print("=" * 60)
    
    tests = [
        ("Rate Limiting Headers", test_rate_limiting_headers),
        ("Contact Endpoint Rate Limiting", test_rate_limiting_with_timing),
        ("GET Endpoint Rate Limiting", test_other_endpoint_rate_limiting)
    ]
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        try:
            result = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🔍 ANALYSIS")
    print("=" * 60)
    print("Rate limiting might not trigger because:")
    print("1. SlowAPI uses IP-based limiting, requests might be distributed")
    print("2. Cloud Run might be load balancing across instances")
    print("3. Rate limiting window might be sliding vs fixed")
    print("4. Authentication failures (401) might not count toward rate limit")
    
    print("\n💡 RECOMMENDATIONS:")
    print("1. Test with authenticated requests")
    print("2. Check Cloud Run logs for rate limiting events")
    print("3. Consider using Redis-backed rate limiting for consistency")

if __name__ == "__main__":
    main()
