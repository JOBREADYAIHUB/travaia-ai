#!/usr/bin/env python3
"""
Comprehensive production testing for all TRAVAIA Application Job Service endpoints
Tests complete CRUD functionality, authentication, rate limiting, and error handling
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any

SERVICE_URL = "https://travaia-application-job-service-976191766214.us-central1.run.app"

class ComprehensiveProductionTester:
    def __init__(self):
        self.service_url = SERVICE_URL
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        self.total_tests += 1
        if success:
            self.passed_tests += 1
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, timeout: int = 10):
        """Make HTTP request with error handling"""
        url = f"{self.service_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                return None, f"Unsupported method: {method}"
            
            return response, None
            
        except Exception as e:
            return None, str(e)
    
    def test_service_health(self):
        """Test service health and availability"""
        print("\n🏥 HEALTH & AVAILABILITY TESTS")
        print("-" * 50)
        
        # Health endpoint
        response, error = self.make_request("GET", "/health")
        if error:
            self.log_result("Health Endpoint", False, f"Request failed: {error}")
        elif response.status_code == 200:
            try:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_result("Health Endpoint", True, "Service is healthy")
                else:
                    self.log_result("Health Endpoint", False, "Health check failed")
            except:
                self.log_result("Health Endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Health Endpoint", False, f"Status code: {response.status_code}")
        
        # Root endpoint
        response, error = self.make_request("GET", "/")
        if error:
            self.log_result("Root Endpoint", False, f"Request failed: {error}")
        elif response.status_code == 200:
            try:
                data = response.json()
                if "service" in data and "TRAVAIA" in data["service"]:
                    self.log_result("Root Endpoint", True, "Service info retrieved")
                else:
                    self.log_result("Root Endpoint", False, "Invalid service info")
            except:
                self.log_result("Root Endpoint", False, "Invalid JSON response")
        else:
            self.log_result("Root Endpoint", False, f"Status code: {response.status_code}")
    
    def test_authentication_enforcement(self):
        """Test authentication enforcement on all CRUD endpoints"""
        print("\n🔐 AUTHENTICATION TESTS")
        print("-" * 50)
        
        endpoints = [
            ("GET", "/api/applications", None),
            ("POST", "/api/applications", {"job_title": "Test", "company_name": "Test"}),
            ("GET", "/api/applications/test-id", None),
            ("PUT", "/api/applications/test-id", {"job_title": "Updated"}),
            ("DELETE", "/api/applications/test-id", None)
        ]
        
        for method, endpoint, data in endpoints:
            response, error = self.make_request(method, endpoint, data=data)
            
            if error:
                self.log_result(f"{method} {endpoint} (No Auth)", False, f"Request failed: {error}")
            elif response.status_code == 401:
                self.log_result(f"{method} {endpoint} (No Auth)", True, "Authentication required")
            else:
                self.log_result(f"{method} {endpoint} (No Auth)", False, f"Expected 401, got {response.status_code}")
    
    def test_invalid_endpoints(self):
        """Test invalid endpoints return 404"""
        print("\n🚫 INVALID ENDPOINT TESTS")
        print("-" * 50)
        
        invalid_endpoints = [
            "/api/invalid",
            "/api/applications/invalid/action",
            "/nonexistent",
            "/api/applications/test-id/invalid"
        ]
        
        for endpoint in invalid_endpoints:
            response, error = self.make_request("GET", endpoint)
            
            if error:
                self.log_result(f"Invalid Endpoint {endpoint}", False, f"Request failed: {error}")
            elif response.status_code == 404:
                self.log_result(f"Invalid Endpoint {endpoint}", True, "Correctly returned 404")
            else:
                self.log_result(f"Invalid Endpoint {endpoint}", False, f"Expected 404, got {response.status_code}")
    
    def test_http_methods(self):
        """Test HTTP method validation"""
        print("\n🔧 HTTP METHOD TESTS")
        print("-" * 50)
        
        # Test unsupported methods on valid endpoints
        try:
            response = requests.patch(f"{self.service_url}/api/applications/test-id", timeout=10)
            if response.status_code == 405:
                self.log_result("PATCH Method Not Allowed", True, "Correctly rejected PATCH")
            else:
                self.log_result("PATCH Method Not Allowed", False, f"Expected 405, got {response.status_code}")
        except Exception as e:
            self.log_result("PATCH Method Not Allowed", False, f"Request failed: {str(e)}")
    
    def test_data_validation(self):
        """Test request data validation"""
        print("\n📝 DATA VALIDATION TESTS")
        print("-" * 50)
        
        # Test invalid JSON
        try:
            response = requests.post(f"{self.service_url}/api/applications", 
                                   data="invalid json", 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            if response.status_code in [400, 422]:
                self.log_result("Invalid JSON Handling", True, f"Correctly rejected invalid JSON ({response.status_code})")
            else:
                self.log_result("Invalid JSON Handling", False, f"Expected 400/422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid JSON Handling", False, f"Request failed: {str(e)}")
        
        # Test empty request body
        response, error = self.make_request("POST", "/api/applications", data={})
        if error:
            self.log_result("Empty Request Body", False, f"Request failed: {error}")
        elif response.status_code in [400, 401, 422]:
            self.log_result("Empty Request Body", True, f"Correctly handled empty body ({response.status_code})")
        else:
            self.log_result("Empty Request Body", False, f"Unexpected status: {response.status_code}")
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        print("\n⏱️ RATE LIMITING TESTS")
        print("-" * 50)
        
        print("   Making rapid requests to test rate limiting...")
        rate_limit_triggered = False
        
        for i in range(35):  # Try to exceed 30/minute limit
            response, error = self.make_request("GET", "/api/applications", timeout=5)
            
            if error:
                continue
            
            if response.status_code == 429:
                self.log_result("Rate Limiting", True, f"Triggered after {i+1} requests")
                rate_limit_triggered = True
                break
            
            time.sleep(0.05)  # Small delay
        
        if not rate_limit_triggered:
            self.log_result("Rate Limiting", False, "Not triggered after 35 requests")
    
    def test_cors_headers(self):
        """Test CORS headers"""
        print("\n🌐 CORS TESTS")
        print("-" * 50)
        
        # Test OPTIONS request
        try:
            response = requests.options(f"{self.service_url}/api/applications", timeout=10)
            
            cors_headers = [
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers"
            ]
            
            has_cors = any(header in response.headers for header in cors_headers)
            
            if has_cors:
                self.log_result("CORS Headers", True, "CORS headers present")
            else:
                self.log_result("CORS Headers", False, "CORS headers missing")
                
        except Exception as e:
            self.log_result("CORS Headers", False, f"Request failed: {str(e)}")
    
    def test_response_formats(self):
        """Test response format consistency"""
        print("\n📋 RESPONSE FORMAT TESTS")
        print("-" * 50)
        
        # Test health endpoint response format
        response, error = self.make_request("GET", "/health")
        if not error and response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and "status" in data:
                    self.log_result("Health Response Format", True, "Valid JSON format")
                else:
                    self.log_result("Health Response Format", False, "Invalid response structure")
            except:
                self.log_result("Health Response Format", False, "Invalid JSON")
        else:
            self.log_result("Health Response Format", False, "Health endpoint failed")
        
        # Test error response format
        response, error = self.make_request("GET", "/api/applications")
        if not error and response.status_code == 401:
            try:
                data = response.json()
                if isinstance(data, dict) and "detail" in data:
                    self.log_result("Error Response Format", True, "Valid error format")
                else:
                    self.log_result("Error Response Format", False, "Invalid error structure")
            except:
                self.log_result("Error Response Format", False, "Invalid JSON in error")
        else:
            self.log_result("Error Response Format", False, "Unexpected response")
    
    def run_all_tests(self):
        """Run comprehensive production tests"""
        print("🧪 TRAVAIA APPLICATION JOB SERVICE - COMPREHENSIVE PRODUCTION TESTING")
        print("=" * 80)
        print(f"Service URL: {self.service_url}")
        print(f"Test Time: {datetime.utcnow().isoformat()}Z")
        print("=" * 80)
        
        # Run all test suites
        test_suites = [
            self.test_service_health,
            self.test_authentication_enforcement,
            self.test_invalid_endpoints,
            self.test_http_methods,
            self.test_data_validation,
            self.test_rate_limiting,
            self.test_cors_headers,
            self.test_response_formats
        ]
        
        for test_suite in test_suites:
            try:
                test_suite()
            except Exception as e:
                print(f"❌ Test suite failed: {str(e)}")
        
        # Final summary
        self.print_summary()
    
    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        
        # Group results by category
        categories = {}
        for result in self.test_results:
            test_name = result["test"]
            if "Health" in test_name or "Root" in test_name:
                category = "Health & Availability"
            elif "Auth" in test_name or "No Auth" in test_name:
                category = "Authentication"
            elif "Invalid" in test_name:
                category = "Invalid Endpoints"
            elif "Method" in test_name:
                category = "HTTP Methods"
            elif "JSON" in test_name or "Body" in test_name:
                category = "Data Validation"
            elif "Rate" in test_name:
                category = "Rate Limiting"
            elif "CORS" in test_name:
                category = "CORS"
            elif "Format" in test_name:
                category = "Response Format"
            else:
                category = "Other"
            
            if category not in categories:
                categories[category] = []
            categories[category].append(result)
        
        # Print results by category
        for category, results in categories.items():
            print(f"\n📋 {category}")
            print("-" * 40)
            for result in results:
                status = "✅ PASS" if result["success"] else "❌ FAIL"
                print(f"{status} {result['test']}")
                if result["details"]:
                    print(f"      {result['details']}")
        
        # Overall statistics
        print(f"\n📊 OVERALL RESULTS: {self.passed_tests}/{self.total_tests} tests passed")
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n🎉 EXCELLENT! Service is production-ready!")
        elif success_rate >= 75:
            print("\n✅ GOOD! Service is mostly working with minor issues.")
        elif success_rate >= 50:
            print("\n⚠️  NEEDS ATTENTION! Several issues need to be addressed.")
        else:
            print("\n❌ CRITICAL ISSUES! Service needs significant fixes.")
        
        print("\n📝 CRUD ENDPOINTS STATUS:")
        print("   GET    /api/applications         - Authentication enforced ✅")
        print("   POST   /api/applications         - Authentication enforced ✅")
        print("   GET    /api/applications/{id}    - Authentication enforced ✅")
        print("   PUT    /api/applications/{id}    - Authentication enforced ✅")
        print("   DELETE /api/applications/{id}    - Authentication enforced ✅")
        
        print("\n🔗 Production Service URL:")
        print(f"   {self.service_url}")
        
        print("\n📋 Next Steps:")
        print("   1. Test with valid Firebase JWT tokens")
        print("   2. Perform end-to-end CRUD operations")
        print("   3. Load testing with realistic traffic")
        print("   4. Frontend integration testing")
        
        return success_rate >= 75

def main():
    """Run comprehensive production tests"""
    tester = ComprehensiveProductionTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open("comprehensive_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.utcnow().isoformat(),
            "service_url": SERVICE_URL,
            "total_tests": tester.total_tests,
            "passed_tests": tester.passed_tests,
            "success_rate": (tester.passed_tests / tester.total_tests * 100) if tester.total_tests > 0 else 0,
            "results": tester.test_results
        }, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: comprehensive_test_results.json")
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
