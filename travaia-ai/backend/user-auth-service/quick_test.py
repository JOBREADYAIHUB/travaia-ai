"""
Quick test script for TRAVAIA User & Authentication Service
Tests basic functionality and API endpoints
"""

import asyncio
import sys
import os
import requests
import json
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class UserAuthServiceTester:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.test_results = []
    
    def log_test(self, test_name, success, message=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
        print(f"{status} {test_name}: {message}")
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    self.log_test("Health Check", True, "Service is healthy")
                    return True
                else:
                    self.log_test("Health Check", False, "Invalid health response")
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "TRAVAIA User & Authentication Service" in data["message"]:
                    self.log_test("Root Endpoint", True, "Service info returned")
                    return True
                else:
                    self.log_test("Root Endpoint", False, "Invalid root response")
                    return False
            else:
                self.log_test("Root Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_status_endpoint(self):
        """Test status endpoint"""
        try:
            response = requests.get(f"{self.base_url}/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if "service" in data and data["service"] == "travaia-user-auth-service":
                    self.log_test("Status Endpoint", True, "Service status returned")
                    return True
                else:
                    self.log_test("Status Endpoint", False, "Invalid status response")
                    return False
            else:
                self.log_test("Status Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Status Endpoint", False, f"Connection error: {str(e)}")
            return False
    
    def test_docs_endpoint(self):
        """Test API documentation endpoint"""
        try:
            response = requests.get(f"{self.base_url}/docs", timeout=10)
            if response.status_code == 200:
                self.log_test("API Docs", True, "Documentation accessible")
                return True
            else:
                self.log_test("API Docs", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Docs", False, f"Connection error: {str(e)}")
            return False
    
    def test_auth_endpoints_structure(self):
        """Test authentication endpoints structure (without authentication)"""
        auth_endpoints = [
            "/auth/register",
            "/auth/login", 
            "/auth/me",
            "/auth/logout",
            "/auth/refresh-token"
        ]
        
        all_passed = True
        for endpoint in auth_endpoints:
            try:
                response = requests.post(f"{self.base_url}{endpoint}", timeout=10)
                # We expect 422 (validation error) or 401 (unauthorized) for these endpoints
                if response.status_code in [422, 401]:
                    self.log_test(f"Auth Endpoint {endpoint}", True, f"Endpoint exists (HTTP {response.status_code})")
                else:
                    self.log_test(f"Auth Endpoint {endpoint}", False, f"Unexpected status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Auth Endpoint {endpoint}", False, f"Connection error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_profile_endpoints_structure(self):
        """Test profile endpoints structure (without authentication)"""
        profile_endpoints = [
            "/profile/",
            "/profile/settings",
            "/profile/completion"
        ]
        
        all_passed = True
        for endpoint in profile_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                # We expect 401 (unauthorized) for these protected endpoints
                if response.status_code == 401:
                    self.log_test(f"Profile Endpoint {endpoint}", True, "Protected endpoint (HTTP 401)")
                else:
                    self.log_test(f"Profile Endpoint {endpoint}", False, f"Unexpected status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Profile Endpoint {endpoint}", False, f"Connection error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def test_gamification_endpoints_structure(self):
        """Test gamification endpoints structure (without authentication)"""
        gamification_endpoints = [
            "/gamification/stats",
            "/gamification/level",
            "/gamification/achievements"
        ]
        
        all_passed = True
        for endpoint in gamification_endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                # We expect 401 (unauthorized) for these protected endpoints
                if response.status_code == 401:
                    self.log_test(f"Gamification Endpoint {endpoint}", True, "Protected endpoint (HTTP 401)")
                else:
                    self.log_test(f"Gamification Endpoint {endpoint}", False, f"Unexpected status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                self.log_test(f"Gamification Endpoint {endpoint}", False, f"Connection error: {str(e)}")
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Running TRAVAIA User & Authentication Service Tests")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 Testing Basic Connectivity...")
        health_ok = self.test_health_endpoint()
        root_ok = self.test_root_endpoint()
        status_ok = self.test_status_endpoint()
        docs_ok = self.test_docs_endpoint()
        
        # API structure tests
        print("\n🔐 Testing Authentication Endpoints...")
        auth_ok = self.test_auth_endpoints_structure()
        
        print("\n👤 Testing Profile Endpoints...")
        profile_ok = self.test_profile_endpoints_structure()
        
        print("\n🎮 Testing Gamification Endpoints...")
        gamification_ok = self.test_gamification_endpoints_structure()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
        
        print(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Service is ready for deployment.")
            return True
        else:
            print("⚠️ Some tests failed. Please check the service configuration.")
            return False

def main():
    """Main test function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test TRAVAIA User & Authentication Service")
    parser.add_argument("--url", default="http://localhost:8080", help="Service URL to test")
    args = parser.parse_args()
    
    tester = UserAuthServiceTester(args.url)
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
