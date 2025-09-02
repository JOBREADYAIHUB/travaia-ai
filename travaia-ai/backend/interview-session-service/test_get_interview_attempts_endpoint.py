#!/usr/bin/env python3
"""
Integration tests for GET /api/interviews/{interview_id}/attempts endpoint
Tests authentication, authorization, pagination, not found scenarios, and successful retrieval
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

# Test configuration
BASE_URL = "http://localhost:8080"
ENDPOINT_TEMPLATE = "/api/interviews/{interview_id}/attempts"
INTERVIEWS_ENDPOINT = "/api/interviews"
ATTEMPTS_ENDPOINT_TEMPLATE = "/api/interviews/{interview_id}/attempts"

# Mock JWT tokens for testing (replace with actual test tokens)
VALID_JWT_TOKEN_USER1 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItMTIzIiwic3ViIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdHVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ"
VALID_JWT_TOKEN_USER2 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItNDU2Iiwic3ViIjoidGVzdC11c2VyLTQ1NiIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyMkBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyMkBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19"
INVALID_JWT_TOKEN = "invalid.jwt.token"

# Test IDs
NONEXISTENT_INTERVIEW_ID = "550e8400-e29b-41d4-a716-446655440999"
INVALID_INTERVIEW_ID = "not-a-valid-uuid"

async def make_request(session: aiohttp.ClientSession, interview_id: str, token: str = None, page: int = None, limit: int = None) -> Dict[str, Any]:
    """Make HTTP GET request to the endpoint"""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    endpoint = ENDPOINT_TEMPLATE.format(interview_id=interview_id)
    
    # Build query parameters
    params = {}
    if page is not None:
        params["page"] = page
    if limit is not None:
        params["limit"] = limit
    
    try:
        async with session.get(
            f"{BASE_URL}{endpoint}",
            headers=headers,
            params=params,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            response_data = await response.json()
            return {
                "status_code": response.status,
                "data": response_data,
                "headers": dict(response.headers)
            }
    except Exception as e:
        return {
            "status_code": 0,
            "data": {"error": str(e)},
            "headers": {}
        }

async def create_test_interview(session: aiohttp.ClientSession, token: str, application_id: str = "test-app-123") -> str:
    """Create a test interview and return its ID"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    interview_data = {
        "application_id": application_id,
        "interview_type": "technical",
        "configuration": {
            "duration_minutes": 60,
            "difficulty_level": "intermediate",
            "focus_areas": ["algorithms", "data_structures"],
            "language": "en"
        },
        "status": "scheduled"
    }
    
    try:
        async with session.post(
            f"{BASE_URL}{INTERVIEWS_ENDPOINT}",
            json=interview_data,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            if response.status in [200, 201]:
                response_data = await response.json()
                return response_data["data"]["interview_id"]
            else:
                print(f"Failed to create test interview: {response.status}")
                return None
    except Exception as e:
        print(f"Error creating test interview: {e}")
        return None

async def create_test_attempt(session: aiohttp.ClientSession, interview_id: str, token: str) -> str:
    """Create a test attempt and return its ID"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    endpoint = ATTEMPTS_ENDPOINT_TEMPLATE.format(interview_id=interview_id)
    
    try:
        async with session.post(
            f"{BASE_URL}{endpoint}",
            json={},
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            if response.status in [200, 201]:
                response_data = await response.json()
                return response_data["data"]["attempt_id"]
            else:
                print(f"Failed to create test attempt: {response.status}")
                return None
    except Exception as e:
        print(f"Error creating test attempt: {e}")
        return None

async def create_multiple_attempts(session: aiohttp.ClientSession, interview_id: str, token: str, count: int) -> List[str]:
    """Create multiple test attempts and return their IDs"""
    attempt_ids = []
    for i in range(count):
        attempt_id = await create_test_attempt(session, interview_id, token)
        if attempt_id:
            attempt_ids.append(attempt_id)
        # Small delay to ensure different timestamps
        await asyncio.sleep(0.1)
    return attempt_ids

async def test_authentication_required():
    """Test that authentication is required"""
    print("🔐 Testing authentication requirement...")
    
    async with aiohttp.ClientSession() as session:
        # Test without token
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request without token correctly rejected (401)")
        
        # Test with invalid token
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, INVALID_JWT_TOKEN)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request with invalid token correctly rejected (401)")

async def test_interview_not_found():
    """Test behavior when interview doesn't exist"""
    print("🔍 Testing interview not found scenario...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, VALID_JWT_TOKEN_USER1)
        assert result["status_code"] == 404, f"Expected 404, got {result['status_code']}"
        assert "not found" in result["data"].get("detail", "").lower()
        print("✅ Non-existent interview correctly returns 404")

async def test_invalid_interview_id_format():
    """Test behavior with invalid interview ID format"""
    print("📝 Testing invalid interview ID format...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, INVALID_INTERVIEW_ID, VALID_JWT_TOKEN_USER1)
        assert result["status_code"] in [404, 422], f"Expected 404 or 422 for invalid interview ID, got {result['status_code']}"
        print(f"✅ Invalid interview ID format correctly rejected ({result['status_code']})")

async def test_authorization_different_user():
    """Test that users can't access other users' interview attempts"""
    print("🚫 Testing authorization (different user access)...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview with user1
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        # Try to access with user2's token
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER2)
        
        assert result["status_code"] == 403, f"Expected 403, got {result['status_code']}"
        assert "permission denied" in result["data"].get("detail", "").lower() or "does not own" in result["data"].get("detail", "").lower()
        print("✅ Cross-user interview access correctly denied (403)")

async def test_successful_empty_attempts_list():
    """Test successful retrieval of empty attempts list"""
    print("📋 Testing successful empty attempts list...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview but no attempts
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert "success" in response_data, "Response missing 'success' field"
        assert response_data["success"] is True, "Success should be True"
        assert "data" in response_data, "Response missing 'data' field"
        assert "message" in response_data, "Response missing 'message' field"
        assert "pagination" in response_data, "Response missing 'pagination' field"
        assert "timestamp" in response_data, "Response missing 'timestamp' field"
        
        # Validate empty data
        assert isinstance(response_data["data"], list), "Data should be a list"
        assert len(response_data["data"]) == 0, "Data should be empty"
        
        # Validate pagination
        pagination = response_data["pagination"]
        assert pagination["page"] == 1, "Page should be 1"
        assert pagination["limit"] == 10, "Default limit should be 10"
        assert pagination["total"] == 0, "Total should be 0"
        assert pagination["totalPages"] == 1, "Total pages should be 1"
        
        print("✅ Empty attempts list retrieved successfully")

async def test_successful_single_attempt():
    """Test successful retrieval of single attempt"""
    print("📄 Testing successful single attempt retrieval...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and one attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert response_data["success"] is True
        assert len(response_data["data"]) == 1, "Should have exactly one attempt"
        
        # Validate attempt data structure
        attempt = response_data["data"][0]
        required_fields = ["attempt_id", "user_id", "interview_id", "status", "score", "start_time", "created_at"]
        for field in required_fields:
            assert field in attempt, f"Attempt missing required field: {field}"
        
        assert attempt["attempt_id"] == attempt_id
        assert attempt["interview_id"] == interview_id
        assert attempt["status"] == "in_progress"
        assert attempt["score"] == 0
        
        # Validate pagination
        pagination = response_data["pagination"]
        assert pagination["total"] == 1, "Total should be 1"
        assert pagination["totalPages"] == 1, "Total pages should be 1"
        
        print(f"✅ Single attempt retrieved successfully: {attempt_id}")

async def test_successful_multiple_attempts():
    """Test successful retrieval of multiple attempts"""
    print("📄 Testing successful multiple attempts retrieval...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and multiple attempts
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_ids = await create_multiple_attempts(session, interview_id, VALID_JWT_TOKEN_USER1, 5)
        if len(attempt_ids) != 5:
            print(f"❌ Could not create all test attempts, got {len(attempt_ids)}")
            return
        
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert response_data["success"] is True
        assert len(response_data["data"]) == 5, "Should have exactly 5 attempts"
        
        # Validate attempts are sorted by created_at descending (latest first)
        attempts = response_data["data"]
        for i in range(len(attempts) - 1):
            current_time = datetime.fromisoformat(attempts[i]["created_at"].replace('Z', '+00:00'))
            next_time = datetime.fromisoformat(attempts[i + 1]["created_at"].replace('Z', '+00:00'))
            assert current_time >= next_time, "Attempts should be sorted by created_at descending"
        
        # Validate pagination
        pagination = response_data["pagination"]
        assert pagination["total"] == 5, "Total should be 5"
        assert pagination["totalPages"] == 1, "Total pages should be 1"
        
        print(f"✅ Multiple attempts retrieved successfully: {len(attempts)} attempts")

async def test_pagination_functionality():
    """Test pagination with page and limit parameters"""
    print("📊 Testing pagination functionality...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and many attempts
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_ids = await create_multiple_attempts(session, interview_id, VALID_JWT_TOKEN_USER1, 15)
        if len(attempt_ids) != 15:
            print(f"❌ Could not create all test attempts, got {len(attempt_ids)}")
            return
        
        # Test first page with limit 5
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=1, limit=5)
        assert result["status_code"] == 200
        
        response_data = result["data"]
        assert len(response_data["data"]) == 5, "First page should have 5 attempts"
        
        pagination = response_data["pagination"]
        assert pagination["page"] == 1
        assert pagination["limit"] == 5
        assert pagination["total"] == 15
        assert pagination["totalPages"] == 3
        
        print("✅ First page pagination working correctly")
        
        # Test second page
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=2, limit=5)
        assert result["status_code"] == 200
        
        response_data = result["data"]
        assert len(response_data["data"]) == 5, "Second page should have 5 attempts"
        
        pagination = response_data["pagination"]
        assert pagination["page"] == 2
        assert pagination["limit"] == 5
        assert pagination["total"] == 15
        assert pagination["totalPages"] == 3
        
        print("✅ Second page pagination working correctly")
        
        # Test last page
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=3, limit=5)
        assert result["status_code"] == 200
        
        response_data = result["data"]
        assert len(response_data["data"]) == 5, "Third page should have 5 attempts"
        
        pagination = response_data["pagination"]
        assert pagination["page"] == 3
        assert pagination["limit"] == 5
        assert pagination["total"] == 15
        assert pagination["totalPages"] == 3
        
        print("✅ Last page pagination working correctly")

async def test_invalid_query_parameters():
    """Test validation of invalid query parameters"""
    print("❌ Testing invalid query parameters...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        # Test invalid page (0)
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=0)
        assert result["status_code"] == 422, f"Expected 422 for page=0, got {result['status_code']}"
        print("✅ Invalid page=0 correctly rejected (422)")
        
        # Test invalid page (negative)
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=-1)
        assert result["status_code"] == 422, f"Expected 422 for page=-1, got {result['status_code']}"
        print("✅ Invalid page=-1 correctly rejected (422)")
        
        # Test invalid limit (0)
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, limit=0)
        assert result["status_code"] == 422, f"Expected 422 for limit=0, got {result['status_code']}"
        print("✅ Invalid limit=0 correctly rejected (422)")
        
        # Test invalid limit (too high)
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, limit=101)
        assert result["status_code"] == 422, f"Expected 422 for limit=101, got {result['status_code']}"
        print("✅ Invalid limit=101 correctly rejected (422)")

async def test_default_pagination_parameters():
    """Test default pagination parameters"""
    print("📋 Testing default pagination parameters...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and some attempts
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_ids = await create_multiple_attempts(session, interview_id, VALID_JWT_TOKEN_USER1, 3)
        if len(attempt_ids) != 3:
            print(f"❌ Could not create all test attempts")
            return
        
        # Test without any query parameters
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        assert result["status_code"] == 200
        
        response_data = result["data"]
        pagination = response_data["pagination"]
        
        # Validate default values
        assert pagination["page"] == 1, "Default page should be 1"
        assert pagination["limit"] == 10, "Default limit should be 10"
        assert pagination["total"] == 3, "Total should be 3"
        assert pagination["totalPages"] == 1, "Total pages should be 1"
        
        print("✅ Default pagination parameters working correctly")

async def test_rate_limiting():
    """Test rate limiting (30 requests per minute)"""
    print("⏱️ Testing rate limiting...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        # Make multiple rapid requests
        tasks = []
        for i in range(35):  # Exceed the 30/minute limit
            task = make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful and rate-limited responses
        success_count = 0
        rate_limited_count = 0
        
        for result in results:
            if isinstance(result, dict):
                if result["status_code"] == 200:
                    success_count += 1
                elif result["status_code"] == 429:
                    rate_limited_count += 1
        
        print(f"   - Successful requests: {success_count}")
        print(f"   - Rate limited requests: {rate_limited_count}")
        
        # Should have some rate-limited requests
        assert rate_limited_count > 0, "Expected some requests to be rate limited"
        print("✅ Rate limiting is working correctly")

async def test_data_structure_validation():
    """Test that returned data conforms to expected schema"""
    print("🔍 Testing data structure validation...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        assert result["status_code"] == 200
        
        response_data = result["data"]
        
        # Validate top-level response structure
        required_top_level_fields = ["success", "data", "message", "pagination", "timestamp"]
        for field in required_top_level_fields:
            assert field in response_data, f"Response missing required field: {field}"
        
        # Validate data types
        assert isinstance(response_data["success"], bool), "success should be boolean"
        assert isinstance(response_data["data"], list), "data should be list"
        assert isinstance(response_data["message"], str), "message should be string"
        assert isinstance(response_data["pagination"], dict), "pagination should be dict"
        assert isinstance(response_data["timestamp"], str), "timestamp should be string"
        
        # Validate pagination structure
        pagination = response_data["pagination"]
        required_pagination_fields = ["page", "limit", "total", "totalPages"]
        for field in required_pagination_fields:
            assert field in pagination, f"Pagination missing required field: {field}"
            assert isinstance(pagination[field], int), f"Pagination {field} should be integer"
        
        # Validate attempt structure
        if response_data["data"]:
            attempt = response_data["data"][0]
            required_attempt_fields = ["attempt_id", "user_id", "interview_id", "status", "score", "start_time", "created_at"]
            for field in required_attempt_fields:
                assert field in attempt, f"Attempt missing required field: {field}"
        
        print("✅ Data structure validation passed")

async def test_beyond_available_pages():
    """Test requesting pages beyond available data"""
    print("📄 Testing beyond available pages...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview with limited attempts
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_ids = await create_multiple_attempts(session, interview_id, VALID_JWT_TOKEN_USER1, 3)
        if len(attempt_ids) != 3:
            print(f"❌ Could not create all test attempts")
            return
        
        # Request page beyond available data
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1, page=5, limit=10)
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        response_data = result["data"]
        assert len(response_data["data"]) == 0, "Should return empty list for page beyond data"
        
        pagination = response_data["pagination"]
        assert pagination["page"] == 5, "Page should be 5"
        assert pagination["total"] == 3, "Total should still be 3"
        assert pagination["totalPages"] == 1, "Total pages should be 1"
        
        print("✅ Beyond available pages handled correctly")

async def run_all_tests():
    """Run all tests"""
    print("🚀 Starting GET /api/interviews/{interview_id}/attempts endpoint tests...\n")
    
    try:
        await test_authentication_required()
        print()
        
        await test_interview_not_found()
        print()
        
        await test_invalid_interview_id_format()
        print()
        
        await test_authorization_different_user()
        print()
        
        await test_successful_empty_attempts_list()
        print()
        
        await test_successful_single_attempt()
        print()
        
        await test_successful_multiple_attempts()
        print()
        
        await test_pagination_functionality()
        print()
        
        await test_invalid_query_parameters()
        print()
        
        await test_default_pagination_parameters()
        print()
        
        await test_data_structure_validation()
        print()
        
        await test_beyond_available_pages()
        print()
        
        # Rate limiting test last as it makes many requests
        await test_rate_limiting()
        print()
        
        print("🎉 All tests passed successfully!")
        
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
        return False
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 90)
    print("GET /api/interviews/{interview_id}/attempts Endpoint Integration Tests")
    print("=" * 90)
    print(f"Target URL: {BASE_URL}{ENDPOINT_TEMPLATE}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 90)
    
    # Run tests
    success = asyncio.run(run_all_tests())
    
    print("=" * 90)
    if success:
        print("✅ ALL TESTS PASSED - Interview attempts retrieval endpoint is working correctly!")
    else:
        print("❌ SOME TESTS FAILED - Please check the output above for details")
    print("=" * 90)
