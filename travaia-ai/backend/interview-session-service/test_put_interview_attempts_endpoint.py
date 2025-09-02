#!/usr/bin/env python3
"""
Integration tests for PUT /api/interviews/{interview_id}/attempts/{attempt_id} endpoint
Tests authentication, authorization, not found scenarios, validation, rate limiting, and successful updates
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8080"
ENDPOINT_TEMPLATE = "/api/interviews/{interview_id}/attempts/{attempt_id}"
INTERVIEWS_ENDPOINT = "/api/interviews"
ATTEMPTS_ENDPOINT_TEMPLATE = "/api/interviews/{interview_id}/attempts"

# Mock JWT tokens for testing (replace with actual test tokens)
VALID_JWT_TOKEN_USER1 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItMTIzIiwic3ViIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdHVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ"
VALID_JWT_TOKEN_USER2 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItNDU2Iiwic3ViIjoidGVzdC11c2VyLTQ1NiIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyMkBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyMkBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19"
INVALID_JWT_TOKEN = "invalid.jwt.token"

# Test IDs
NONEXISTENT_INTERVIEW_ID = "550e8400-e29b-41d4-a716-446655440999"
NONEXISTENT_ATTEMPT_ID = "a1b2c3d4e5f6g7h8"
INVALID_INTERVIEW_ID = "not-a-valid-uuid"
INVALID_ATTEMPT_ID = "not-valid"

# Test update data
VALID_STATUS_UPDATE = {"status": "completed"}
VALID_SCORE_UPDATE = {"score": 85}
VALID_FULL_UPDATE = {
    "status": "completed",
    "score": 92,
    "end_time": datetime.now(timezone.utc).isoformat(),
    "recording_url": "https://example.com/recording.mp4",
    "feedback_report_id": "feedback-123"
}
INVALID_SCORE_UPDATE_LOW = {"score": -5}
INVALID_SCORE_UPDATE_HIGH = {"score": 150}
INVALID_STATUS_UPDATE = {"status": "invalid_status"}
EMPTY_UPDATE = {}

async def make_request(session: aiohttp.ClientSession, interview_id: str, attempt_id: str, token: str = None, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make HTTP PUT request to the endpoint"""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    endpoint = ENDPOINT_TEMPLATE.format(interview_id=interview_id, attempt_id=attempt_id)
    request_data = data if data is not None else {}
    
    try:
        async with session.put(
            f"{BASE_URL}{endpoint}",
            json=request_data,
            headers=headers,
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

async def test_authentication_required():
    """Test that authentication is required"""
    print("🔐 Testing authentication requirement...")
    
    async with aiohttp.ClientSession() as session:
        # Test without token
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, NONEXISTENT_ATTEMPT_ID, data=VALID_STATUS_UPDATE)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request without token correctly rejected (401)")
        
        # Test with invalid token
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, NONEXISTENT_ATTEMPT_ID, INVALID_JWT_TOKEN, VALID_STATUS_UPDATE)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request with invalid token correctly rejected (401)")

async def test_interview_not_found():
    """Test behavior when interview doesn't exist"""
    print("🔍 Testing interview not found scenario...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, NONEXISTENT_ATTEMPT_ID, VALID_JWT_TOKEN_USER1, VALID_STATUS_UPDATE)
        assert result["status_code"] == 404, f"Expected 404, got {result['status_code']}"
        assert "not found" in result["data"].get("detail", "").lower()
        print("✅ Non-existent interview correctly returns 404")

async def test_attempt_not_found():
    """Test behavior when attempt doesn't exist"""
    print("🔍 Testing attempt not found scenario...")
    
    async with aiohttp.ClientSession() as session:
        # Create a test interview first
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview for attempt not found test")
            return
        
        result = await make_request(session, interview_id, NONEXISTENT_ATTEMPT_ID, VALID_JWT_TOKEN_USER1, VALID_STATUS_UPDATE)
        assert result["status_code"] == 404, f"Expected 404, got {result['status_code']}"
        assert "not found" in result["data"].get("detail", "").lower()
        print("✅ Non-existent attempt correctly returns 404")

async def test_invalid_ids_format():
    """Test behavior with invalid ID formats"""
    print("📝 Testing invalid ID formats...")
    
    async with aiohttp.ClientSession() as session:
        # Invalid interview ID
        result = await make_request(session, INVALID_INTERVIEW_ID, NONEXISTENT_ATTEMPT_ID, VALID_JWT_TOKEN_USER1, VALID_STATUS_UPDATE)
        assert result["status_code"] in [404, 422], f"Expected 404 or 422 for invalid interview ID, got {result['status_code']}"
        print(f"✅ Invalid interview ID format correctly rejected ({result['status_code']})")
        
        # Invalid attempt ID
        result = await make_request(session, NONEXISTENT_INTERVIEW_ID, INVALID_ATTEMPT_ID, VALID_JWT_TOKEN_USER1, VALID_STATUS_UPDATE)
        assert result["status_code"] in [404, 422], f"Expected 404 or 422 for invalid attempt ID, got {result['status_code']}"
        print(f"✅ Invalid attempt ID format correctly rejected ({result['status_code']})")

async def test_successful_status_update():
    """Test successful status update"""
    print("✨ Testing successful status update...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Update status
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, VALID_STATUS_UPDATE)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert "success" in response_data, "Response missing 'success' field"
        assert response_data["success"] is True, "Success should be True"
        assert "data" in response_data, "Response missing 'data' field"
        assert "message" in response_data, "Response missing 'message' field"
        
        # Validate updated data
        attempt_data = response_data["data"]
        assert attempt_data["status"] == "completed"
        assert attempt_data["attempt_id"] == attempt_id
        assert attempt_data["interview_id"] == interview_id
        
        print(f"✅ Status updated successfully to: {attempt_data['status']}")

async def test_successful_score_update():
    """Test successful score update"""
    print("📊 Testing successful score update...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Update score
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, VALID_SCORE_UPDATE)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate updated data
        attempt_data = result["data"]["data"]
        assert attempt_data["score"] == 85
        assert attempt_data["status"] == "in_progress"  # Should remain unchanged
        
        print(f"✅ Score updated successfully to: {attempt_data['score']}")

async def test_successful_full_update():
    """Test successful full update with multiple fields"""
    print("🔄 Testing successful full update...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Update multiple fields
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, VALID_FULL_UPDATE)
        
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate updated data
        attempt_data = result["data"]["data"]
        assert attempt_data["status"] == "completed"
        assert attempt_data["score"] == 92
        assert attempt_data["recording_url"] == "https://example.com/recording.mp4"
        assert attempt_data["feedback_report_id"] == "feedback-123"
        assert "end_time" in attempt_data
        
        print(f"✅ Full update successful - Status: {attempt_data['status']}, Score: {attempt_data['score']}")

async def test_authorization_different_user():
    """Test that users can't update other users' attempts"""
    print("🚫 Testing authorization (different user access)...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview and attempt with user1
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Try to update with user2's token
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER2, VALID_STATUS_UPDATE)
        
        assert result["status_code"] == 403, f"Expected 403, got {result['status_code']}"
        assert "access denied" in result["data"].get("detail", "").lower() or "permission" in result["data"].get("detail", "").lower()
        print("✅ Cross-user attempt update correctly denied (403)")

async def test_validation_errors():
    """Test validation errors for invalid data"""
    print("❌ Testing validation errors...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Test invalid score (too low)
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, INVALID_SCORE_UPDATE_LOW)
        assert result["status_code"] == 422, f"Expected 422 for low score, got {result['status_code']}"
        print("✅ Invalid low score correctly rejected (422)")
        
        # Test invalid score (too high)
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, INVALID_SCORE_UPDATE_HIGH)
        assert result["status_code"] == 422, f"Expected 422 for high score, got {result['status_code']}"
        print("✅ Invalid high score correctly rejected (422)")
        
        # Test invalid status
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, INVALID_STATUS_UPDATE)
        assert result["status_code"] == 422, f"Expected 422 for invalid status, got {result['status_code']}"
        print("✅ Invalid status correctly rejected (422)")

async def test_empty_update():
    """Test empty update (should succeed but make no changes)"""
    print("📝 Testing empty update...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Empty update
        result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, EMPTY_UPDATE)
        assert result["status_code"] == 200, f"Expected 200 for empty update, got {result['status_code']}"
        
        # Should return original data unchanged
        attempt_data = result["data"]["data"]
        assert attempt_data["status"] == "in_progress"  # Original status
        assert attempt_data["score"] == 0  # Original score
        
        print("✅ Empty update correctly handled (200)")

async def test_partial_updates_preserve_existing():
    """Test that partial updates preserve existing fields"""
    print("🔄 Testing partial updates preserve existing fields...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # First update: set score
        result1 = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, {"score": 75})
        assert result1["status_code"] == 200
        
        # Second update: set status only
        result2 = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, {"status": "completed"})
        assert result2["status_code"] == 200
        
        # Verify both fields are preserved
        attempt_data = result2["data"]["data"]
        assert attempt_data["status"] == "completed"
        assert attempt_data["score"] == 75  # Should be preserved
        
        print("✅ Partial updates correctly preserve existing fields")

async def test_rate_limiting():
    """Test rate limiting (30 requests per minute)"""
    print("⏱️ Testing rate limiting...")
    
    async with aiohttp.ClientSession() as session:
        # Create test interview and attempt
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview")
            return
        
        attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
        if not attempt_id:
            print("❌ Could not create test attempt")
            return
        
        # Make multiple rapid requests
        tasks = []
        for i in range(35):  # Exceed the 30/minute limit
            task = make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, {"score": i % 100})
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

async def test_different_status_transitions():
    """Test different status transitions"""
    print("🔄 Testing different status transitions...")
    
    statuses = ["in_progress", "completed", "cancelled"]
    
    async with aiohttp.ClientSession() as session:
        for status in statuses:
            # Create test interview and attempt
            interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1, f"app-{status}")
            if not interview_id:
                continue
            
            attempt_id = await create_test_attempt(session, interview_id, VALID_JWT_TOKEN_USER1)
            if not attempt_id:
                continue
            
            # Update to specific status
            result = await make_request(session, interview_id, attempt_id, VALID_JWT_TOKEN_USER1, {"status": status})
            assert result["status_code"] == 200, f"Failed to update to status: {status}"
            
            attempt_data = result["data"]["data"]
            assert attempt_data["status"] == status
            print(f"✅ Successfully updated to status: {status}")

async def run_all_tests():
    """Run all tests"""
    print("🚀 Starting PUT /api/interviews/{interview_id}/attempts/{attempt_id} endpoint tests...\n")
    
    try:
        await test_authentication_required()
        print()
        
        await test_interview_not_found()
        print()
        
        await test_attempt_not_found()
        print()
        
        await test_invalid_ids_format()
        print()
        
        await test_successful_status_update()
        print()
        
        await test_successful_score_update()
        print()
        
        await test_successful_full_update()
        print()
        
        await test_authorization_different_user()
        print()
        
        await test_validation_errors()
        print()
        
        await test_empty_update()
        print()
        
        await test_partial_updates_preserve_existing()
        print()
        
        await test_different_status_transitions()
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
    print("PUT /api/interviews/{interview_id}/attempts/{attempt_id} Endpoint Integration Tests")
    print("=" * 90)
    print(f"Target URL: {BASE_URL}{ENDPOINT_TEMPLATE}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 90)
    
    # Run tests
    success = asyncio.run(run_all_tests())
    
    print("=" * 90)
    if success:
        print("✅ ALL TESTS PASSED - Interview attempt update endpoint is working correctly!")
    else:
        print("❌ SOME TESTS FAILED - Please check the output above for details")
    print("=" * 90)
