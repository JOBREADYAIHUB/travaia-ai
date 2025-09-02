"""
Production test script for AI Reports CRUD API endpoints
Tests all deployed CRUD operations against the live service
"""

import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Production service URL
SERVICE_URL = "https://travaia-document-report-service-3666tidp6a-uc.a.run.app"

# Mock authentication token for testing
MOCK_JWT_TOKEN = "mock-jwt-token-production-test"

# Test headers
HEADERS = {
    "Authorization": f"Bearer {MOCK_JWT_TOKEN}",
    "Content-Type": "application/json"
}

class ProductionCRUDTester:
    """Test all CRUD endpoints in production"""
    
    def __init__(self):
        self.base_url = SERVICE_URL
        self.headers = HEADERS
        self.created_report_ids = []
    
    async def test_health_check(self) -> bool:
        """Test service health"""
        print("🏥 Testing health endpoint...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/health")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Health check passed: {data.get('status', 'unknown')}")
                    return True
                else:
                    print(f"❌ Health check failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Health check error: {str(e)}")
            return False
    
    async def test_create_ai_report(self) -> Optional[str]:
        """Test POST /api/ai-reports"""
        print("\n📝 Testing AI report creation...")
        
        test_data = {
            "report_type": "production_test_report",
            "content": {
                "score": 88.5,
                "strengths": [
                    "Excellent problem-solving approach",
                    "Strong technical communication",
                    "Good understanding of system architecture"
                ],
                "weaknesses": [
                    "Could improve on edge case handling",
                    "More experience needed with distributed systems"
                ],
                "detailed_feedback": "Overall strong performance with clear potential for growth in complex system design.",
                "transcription": "Candidate demonstrated solid technical knowledge and clear thinking process..."
            },
            "metadata": {
                "test_timestamp": datetime.utcnow().isoformat(),
                "test_type": "production_validation"
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/ai-reports",
                    headers=self.headers,
                    json=test_data
                )
                
                if response.status_code == 201:
                    data = response.json()
                    report_id = data["data"]["report"]["report_id"]
                    self.created_report_ids.append(report_id)
                    
                    print(f"✅ Report created successfully: {report_id}")
                    print(f"   Score: {data['data']['report']['content']['score']}")
                    print(f"   Type: {data['data']['report']['report_type']}")
                    
                    return report_id
                else:
                    print(f"❌ Create failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return None
                    
        except Exception as e:
            print(f"❌ Create error: {str(e)}")
            return None
    
    async def test_get_ai_reports_list(self) -> bool:
        """Test GET /api/ai-reports (paginated list)"""
        print("\n📋 Testing AI reports list retrieval...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/ai-reports?page=1&limit=5",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    reports = data["data"]["reports"]
                    pagination = data["pagination"]
                    
                    print(f"✅ List retrieved successfully")
                    print(f"   Reports count: {len(reports)}")
                    print(f"   Total reports: {pagination['total']}")
                    print(f"   Current page: {pagination['page']}")
                    
                    return True
                else:
                    print(f"❌ List retrieval failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ List retrieval error: {str(e)}")
            return False
    
    async def test_get_ai_report_by_id(self, report_id: str) -> bool:
        """Test GET /api/ai-reports/{report_id}"""
        print(f"\n🔍 Testing single report retrieval: {report_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/ai-reports/{report_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    report = data["data"]["report"]
                    
                    print(f"✅ Report retrieved successfully")
                    print(f"   Report ID: {report['report_id']}")
                    print(f"   Type: {report['report_type']}")
                    print(f"   Score: {report['content']['score']}")
                    
                    return True
                elif response.status_code == 404:
                    print(f"❌ Report not found: {report_id}")
                    return False
                else:
                    print(f"❌ Retrieval failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Retrieval error: {str(e)}")
            return False
    
    async def test_update_ai_report(self, report_id: str) -> bool:
        """Test PUT /api/ai-reports/{report_id}"""
        print(f"\n✏️ Testing report update: {report_id}")
        
        update_data = {
            "content": {
                "score": 92.0,
                "strengths": [
                    "Excellent problem-solving approach",
                    "Strong technical communication",
                    "Good understanding of system architecture",
                    "Demonstrates leadership potential"
                ],
                "weaknesses": [
                    "Could improve on edge case handling"
                ],
                "detailed_feedback": "Significantly improved performance showing excellent growth and leadership qualities.",
                "transcription": "Updated transcription with additional insights and improved analysis..."
            },
            "metadata": {
                "updated_timestamp": datetime.utcnow().isoformat(),
                "update_reason": "production_test_validation"
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/api/ai-reports/{report_id}",
                    headers=self.headers,
                    json=update_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    report = data["data"]["report"]
                    
                    print(f"✅ Report updated successfully")
                    print(f"   New score: {report['content']['score']}")
                    print(f"   Strengths count: {len(report['content']['strengths'])}")
                    print(f"   Weaknesses count: {len(report['content']['weaknesses'])}")
                    
                    return True
                elif response.status_code == 404:
                    print(f"❌ Report not found for update: {report_id}")
                    return False
                else:
                    print(f"❌ Update failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Update error: {str(e)}")
            return False
    
    async def test_delete_ai_report(self, report_id: str) -> bool:
        """Test DELETE /api/ai-reports/{report_id}"""
        print(f"\n🗑️ Testing report deletion: {report_id}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/api/ai-reports/{report_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    print(f"✅ Report deleted successfully")
                    print(f"   Deleted ID: {data['data']['report_id']}")
                    
                    # Verify deletion by trying to get the report
                    verify_response = await client.get(
                        f"{self.base_url}/api/ai-reports/{report_id}",
                        headers=self.headers
                    )
                    
                    if verify_response.status_code == 404:
                        print(f"✅ Deletion verified - report no longer exists")
                        return True
                    else:
                        print(f"⚠️ Deletion may not have worked - report still exists")
                        return False
                        
                elif response.status_code == 404:
                    print(f"❌ Report not found for deletion: {report_id}")
                    return False
                else:
                    print(f"❌ Deletion failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Deletion error: {str(e)}")
            return False
    
    async def test_authentication_errors(self) -> bool:
        """Test authentication error handling"""
        print("\n🔒 Testing authentication errors...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Test without auth header
                response = await client.get(f"{self.base_url}/api/ai-reports")
                
                if response.status_code == 401:
                    print("✅ Authentication properly enforced (401 without token)")
                    return True
                else:
                    print(f"❌ Authentication not enforced: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Auth test error: {str(e)}")
            return False
    
    async def test_validation_errors(self) -> bool:
        """Test request validation"""
        print("\n✅ Testing request validation...")
        
        invalid_data = {
            "report_type": "",  # Empty type
            "content": {
                "score": 150,  # Invalid score > 100
                "strengths": [],
                "weaknesses": []
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/ai-reports",
                    headers=self.headers,
                    json=invalid_data
                )
                
                if response.status_code == 422:
                    print("✅ Request validation working (422 for invalid data)")
                    return True
                else:
                    print(f"❌ Validation not working: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Validation test error: {str(e)}")
            return False
    
    async def run_full_test_suite(self):
        """Run complete CRUD test suite"""
        print("🚀 Starting Production AI Reports CRUD Test Suite")
        print(f"🌐 Testing service: {self.base_url}")
        print("=" * 60)
        
        results = {}
        
        # Test 1: Health check
        results["health"] = await self.test_health_check()
        
        if not results["health"]:
            print("\n❌ Service not healthy, stopping tests")
            return results
        
        # Test 2: Authentication
        results["auth"] = await self.test_authentication_errors()
        
        # Test 3: Validation
        results["validation"] = await self.test_validation_errors()
        
        # Test 4: Create report
        report_id = await self.test_create_ai_report()
        results["create"] = report_id is not None
        
        if report_id:
            # Test 5: Get reports list
            results["list"] = await self.test_get_ai_reports_list()
            
            # Test 6: Get single report
            results["get"] = await self.test_get_ai_report_by_id(report_id)
            
            # Test 7: Update report
            results["update"] = await self.test_update_ai_report(report_id)
            
            # Test 8: Delete report
            results["delete"] = await self.test_delete_ai_report(report_id)
        else:
            results.update({
                "list": False,
                "get": False,
                "update": False,
                "delete": False
            })
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"{test_name.upper():12} {status}")
        
        print("-" * 60)
        print(f"TOTAL: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED! CRUD API is production ready!")
        else:
            print(f"⚠️ {total_tests - passed_tests} tests failed. Review issues above.")
        
        return results

async def main():
    """Main test execution"""
    tester = ProductionCRUDTester()
    await tester.run_full_test_suite()

if __name__ == "__main__":
    asyncio.run(main())
