#!/usr/bin/env python3
"""
Comprehensive production testing script for TRAVAIA Application Job Service CRUD endpoints
Tests all endpoints: GET, POST, GET by ID, PUT, DELETE
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Production service URL
SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

# Test configuration
TEST_CONFIG = {
    "timeout": 30,
    "retry_attempts": 3,
    "retry_delay": 2
}

class ProductionTester:
    def __init__(self):
        self.service_url = SERVICE_URL
        self.test_results = []
        self.created_application_id = None
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request with retry logic"""
        url = f"{self.service_url}{endpoint}"
        
        for attempt in range(TEST_CONFIG["retry_attempts"]):
            try:
                if method.upper() == "GET":
                    response = requests.get(url, headers=headers, timeout=TEST_CONFIG["timeout"])
                elif method.upper() == "POST":
                    response = requests.post(url, json=data, headers=headers, timeout=TEST_CONFIG["timeout"])
                elif method.upper() == "PUT":
                    response = requests.put(url, json=data, headers=headers, timeout=TEST_CONFIG["timeout"])
                elif method.upper() == "DELETE":
                    response = requests.delete(url, headers=headers, timeout=TEST_CONFIG["timeout"])
                else:
                    return False, f"Unsupported method: {method}"
                
                return True, response
                
            except requests.exceptions.RequestException as e:
                if attempt < TEST_CONFIG["retry_attempts"] - 1:
                    time.sleep(TEST_CONFIG["retry_delay"])
                    continue
                return False, f"Request failed after {TEST_CONFIG['retry_attempts']} attempts: {str(e)}"
        
        return False, "Max retry attempts reached"
    
    def test_service_health(self):
        """Test service health endpoint"""
        print("\n🔍 Testing Service Health...")
        
        success, response = self.make_request("GET", "/health")
        if not success:
            self.log_test("Service Health Check", False, f"Health endpoint failed: {response}")
            return False
        
        if response.status_code == 200:
            self.log_test("Service Health Check", True, f"Service is healthy (Status: {response.status_code})")
            return True
        else:
            self.log_test("Service Health Check", False, f"Unexpected status code: {response.status_code}")
            return False
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        print("\n🔍 Testing Root Endpoint...")
        
        success, response = self.make_request("GET", "/")
        if not success:
            self.log_test("Root Endpoint", False, f"Root endpoint failed: {response}")
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if "service" in data and "TRAVAIA" in data["service"]:
                    self.log_test("Root Endpoint", True, f"Service info retrieved successfully")
                    return True
                else:
                    self.log_test("Root Endpoint", False, "Invalid service response format")
                    return False
            except json.JSONDecodeError:
                self.log_test("Root Endpoint", False, "Invalid JSON response")
                return False
        else:
            self.log_test("Root Endpoint", False, f"Unexpected status code: {response.status_code}")
            return False
    
    def test_get_applications_no_auth(self):
        """Test GET /api/applications without authentication (should fail)"""
        print("\n🔍 Testing GET /api/applications (No Auth)...")
        
        success, response = self.make_request("GET", "/api/applications")
        if not success:
            self.log_test("GET Applications (No Auth)", False, f"Request failed: {response}")
            return False
        
        if response.status_code == 401:
            self.log_test("GET Applications (No Auth)", True, "Correctly rejected unauthenticated request")
            return True
        else:
            self.log_test("GET Applications (No Auth)", False, f"Expected 401, got {response.status_code}")
            return False
    
    def test_post_application_no_auth(self):
        """Test POST /api/applications without authentication (should fail)"""
        print("\n🔍 Testing POST /api/applications (No Auth)...")
        
        test_data = {
            "job_title": "Test Software Engineer",
            "company_name": "Test Company"
        }
        
        success, response = self.make_request("POST", "/api/applications", data=test_data)
        if not success:
            self.log_test("POST Application (No Auth)", False, f"Request failed: {response}")
            return False
        
        if response.status_code == 401:
            self.log_test("POST Application (No Auth)", True, "Correctly rejected unauthenticated request")
            return True
        else:
            self.log_test("POST Application (No Auth)", False, f"Expected 401, got {response.status_code}")
            return False
    
    def test_get_application_by_id_no_auth(self):
        """Test GET /api/applications/{id} without authentication (should fail)"""
        print("\n🔍 Testing GET /api/applications/{id} (No Auth)...")
        
        test_id = "test-application-id"
        success, response = self.make_request("GET", f"/api/applications/{test_id}")
        if not success:
            self.log_test("GET Application by ID (No Auth)", False, f"Request failed: {response}")
            return False
        
        if response.status_code == 401:
            self.log_test("GET Application by ID (No Auth)", True, "Correctly rejected unauthenticated request")
            return True
        else:
            self.log_test("GET Application by ID (No Auth)", False, f"Expected 401, got {response.status_code}")
            return False
    
    def test_put_application_no_auth(self):
        """Test PUT /api/applications/{id} without authentication (should fail)"""
        print("\n🔍 Testing PUT /api/applications/{id} (No Auth)...")
        
        test_id = "test-application-id"
        test_data = {"job_title": "Updated Title"}
        
        success, response = self.make_request("PUT", f"/api/applications/{test_id}", data=test_data)
        if not success:
            self.log_test("PUT Application (No Auth)", False, f"Request failed: {response}")
            return False
        
        if response.status_code == 401:
            self.log_test("PUT Application (No Auth)", True, "Correctly rejected unauthenticated request")
            return True
        else:
            self.log_test("PUT Application (No Auth)", False, f"Expected 401, got {response.status_code}")
            return False
    
    def test_delete_application_no_auth(self):
        """Test DELETE /api/applications/{id} without authentication (should fail)"""
        print("\n🔍 Testing DELETE /api/applications/{id} (No Auth)...")
        
        test_id = "test-application-id"
        success, response = self.make_request("DELETE", f"/api/applications/{test_id}")
        if not success:
            self.log_test("DELETE Application (No Auth)", False, f"Request failed: {response}")
            return False
        
        if response.status_code == 401:
            self.log_test("DELETE Application (No Auth)", True, "Correctly rejected unauthenticated request")
            return True
        else:
            self.log_test("DELETE Application (No Auth)", False, f"Expected 401, got {response.status_code}")
            return False
    
    def test_invalid_endpoints(self):
        """Test invalid endpoints (should return 404)"""
        print("\n🔍 Testing Invalid Endpoints...")
        
        invalid_endpoints = [
            "/api/invalid",
            "/api/applications/invalid/action",
            "/nonexistent"
        ]
        
        all_passed = True
        for endpoint in invalid_endpoints:
            success, response = self.make_request("GET", endpoint)
            if success and response.status_code == 404:
                self.log_test(f"Invalid Endpoint {endpoint}", True, "Correctly returned 404")
            else:
                self.log_test(f"Invalid Endpoint {endpoint}", False, f"Expected 404, got {response.status_code if success else 'request failed'}")
                all_passed = False
        
        return all_passed
    
    def test_rate_limiting(self):
        """Test rate limiting (make multiple rapid requests)"""
        print("\n🔍 Testing Rate Limiting...")
        
        # Make 35 rapid requests to trigger rate limiting (limit is 30/minute)
        rate_limit_triggered = False
        
        for i in range(35):
            success, response = self.make_request("GET", "/api/applications")
            if success and response.status_code == 429:
                rate_limit_triggered = True
                break
            time.sleep(0.1)  # Small delay between requests
        
        if rate_limit_triggered:
            self.log_test("Rate Limiting", True, "Rate limiting correctly triggered after multiple requests")
            return True
        else:
            self.log_test("Rate Limiting", False, "Rate limiting not triggered (may need more requests or longer test)")
            return False
    
    def run_all_tests(self):
        """Run all production tests"""
        print("🧪 TRAVAIA Application Job Service - Production CRUD Testing")
        print("=" * 80)
        print(f"Service URL: {self.service_url}")
        print(f"Test Time: {datetime.utcnow().isoformat()}Z")
        print("=" * 80)
        
        # Basic service tests
        tests = [
            ("Service Health", self.test_service_health),
            ("Root Endpoint", self.test_root_endpoint),
            ("GET Applications (No Auth)", self.test_get_applications_no_auth),
            ("POST Application (No Auth)", self.test_post_application_no_auth),
            ("GET Application by ID (No Auth)", self.test_get_application_by_id_no_auth),
            ("PUT Application (No Auth)", self.test_put_application_no_auth),
            ("DELETE Application (No Auth)", self.test_delete_application_no_auth),
            ("Invalid Endpoints", self.test_invalid_endpoints),
            ("Rate Limiting", self.test_rate_limiting),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                if result:
                    passed += 1
            except Exception as e:
                self.log_test(test_name, False, f"Test threw exception: {str(e)}")
        
        # Summary
        print("\n" + "=" * 80)
        print("📋 PRODUCTION TEST SUMMARY")
        print("=" * 80)
        
        for result in self.test_results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status} - {result['test']}")
            if result["details"]:
                print(f"      {result['details']}")
        
        print(f"\n📊 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n🎉 All production tests passed!")
            print("\n📝 Service Status:")
            print("   ✅ Service is deployed and healthy")
            print("   ✅ All CRUD endpoints are registered")
            print("   ✅ Authentication is properly enforced")
            print("   ✅ Rate limiting is working")
            print("   ✅ Error handling is correct")
            print("\n⚠️  Note: Authentication tests show 401 responses as expected.")
            print("   To test authenticated endpoints, you'll need valid JWT tokens.")
            print("\n📝 Next Steps:")
            print("   1. Test with valid Firebase JWT tokens")
            print("   2. Test full CRUD operations with authentication")
            print("   3. Test with real user data")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed. Please review the service deployment.")
        
        return passed == total

def main():
    """Main test execution"""
    tester = ProductionTester()
    success = tester.run_all_tests()
    
    # Save test results
    with open("production_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.utcnow().isoformat(),
            "service_url": SERVICE_URL,
            "total_tests": len(tester.test_results),
            "passed_tests": sum(1 for r in tester.test_results if r["success"]),
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Test results saved to: production_test_results.json")
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
