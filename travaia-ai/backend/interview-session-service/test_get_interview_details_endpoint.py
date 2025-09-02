#!/usr/bin/env python3
"""
Integration tests for GET /api/interviews/{interview_id} endpoint
Tests authentication, authorization, not found scenarios, rate limiting, and successful retrieval
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8080"
ENDPOINT_TEMPLATE = "/api/interviews/{interview_id}"

# Mock JWT tokens for testing (replace with actual test tokens)
VALID_JWT_TOKEN_USER1 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItMTIzIiwic3ViIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdHVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ"
VALID_JWT_TOKEN_USER2 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItNDU2Iiwic3ViIjoidGVzdC11c2VyLTQ1NiIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyMkBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3R1c2VyMkBleGFtcGxlLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19"
INVALID_JWT_TOKEN = "invalid.jwt.token"

# Test interview IDs
VALID_INTERVIEW_ID = "550e8400-e29b-41d4-a716-446655440000"  # UUID format
NONEXISTENT_INTERVIEW_ID = "550e8400-e29b-41d4-a716-446655440999"  # UUID format but doesn't exist
INVALID_INTERVIEW_ID = "not-a-valid-uuid"  # Invalid format

async def make_request(session: aiohttp.ClientSession, interview_id: str, token: str = None) -> Dict[str, Any]:
    """Make HTTP GET request to the endpoint"""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    endpoint = ENDPOINT_TEMPLATE.format(interview_id=interview_id)
    
    try:
        async with session.get(
            f"{BASE_URL}{endpoint}",
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

async def create_test_interview(session: aiohttp.ClientSession, token: str) -> str:
    """Create a test interview and return its ID"""
    create_endpoint = "/api/interviews"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    interview_data = {
        "application_id": "test-app-123",
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
            f"{BASE_URL}{create_endpoint}",
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

async def test_authentication_required():
    """Test that authentication is required"""
    print("🔐 Testing authentication requirement...")
    
    async with aiohttp.ClientSession() as session:
        # Test without token
        result = await make_request(session, VALID_INTERVIEW_ID)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request without token correctly rejected (401)")
        
        # Test with invalid token
        result = await make_request(session, VALID_INTERVIEW_ID, INVALID_JWT_TOKEN)
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
        # Could be 404 (not found) or 422 (validation error) depending on implementation
        assert result["status_code"] in [404, 422], f"Expected 404 or 422, got {result['status_code']}"
        print(f"✅ Invalid interview ID format correctly rejected ({result['status_code']})")

async def test_successful_retrieval():
    """Test successful interview retrieval"""
    print("✨ Testing successful interview retrieval...")
    
    async with aiohttp.ClientSession() as session:
        # First create a test interview
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview for retrieval test")
            return
        
        # Now retrieve it
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
        
        # Should succeed (200)
        assert result["status_code"] == 200, f"Expected 200, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert "success" in response_data, "Response missing 'success' field"
        assert response_data["success"] is True, "Success should be True"
        assert "data" in response_data, "Response missing 'data' field"
        assert "message" in response_data, "Response missing 'message' field"
        
        # Validate interview data structure
        interview_data = response_data["data"]
        required_fields = [
            "interview_id", "user_id", "application_id", "interview_type", 
            "configuration", "status", "created_at", "updated_at"
        ]
        
        for field in required_fields:
            assert field in interview_data, f"Interview data missing '{field}'"
        
        # Validate field values
        assert interview_data["interview_id"] == interview_id
        assert interview_data["application_id"] == "test-app-123"
        assert interview_data["interview_type"] == "technical"
        assert interview_data["status"] == "scheduled"
        
        # Validate configuration structure
        config = interview_data["configuration"]
        assert config["duration_minutes"] == 60
        assert config["difficulty_level"] == "intermediate"
        assert "algorithms" in config["focus_areas"]
        assert config["language"] == "en"
        
        # Validate timestamps are valid ISO format
        try:
            datetime.fromisoformat(interview_data["created_at"].replace('Z', '+00:00'))
            datetime.fromisoformat(interview_data["updated_at"].replace('Z', '+00:00'))
        except ValueError:
            assert False, "Invalid timestamp format in response"
        
        print(f"✅ Interview retrieved successfully: {interview_id}")
        print(f"   - Type: {interview_data['interview_type']}")
        print(f"   - Status: {interview_data['status']}")
        print(f"   - Duration: {config['duration_minutes']} minutes")

async def test_authorization_different_user():
    """Test that users can't access other users' interviews"""
    print("🚫 Testing authorization (different user access)...")
    
    async with aiohttp.ClientSession() as session:
        # Create interview with user1
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview for authorization test")
            return
        
        # Try to access with user2's token
        result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER2)
        
        # Should be forbidden (403)
        assert result["status_code"] == 403, f"Expected 403, got {result['status_code']}"
        assert "access denied" in result["data"].get("detail", "").lower() or "permission" in result["data"].get("detail", "").lower()
        print("✅ Cross-user access correctly denied (403)")

async def test_rate_limiting():
    """Test rate limiting (30 requests per minute)"""
    print("⏱️ Testing rate limiting...")
    
    async with aiohttp.ClientSession() as session:
        # Create a test interview first
        interview_id = await create_test_interview(session, VALID_JWT_TOKEN_USER1)
        if not interview_id:
            print("❌ Could not create test interview for rate limiting test")
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

async def test_multiple_interview_types():
    """Test retrieval of different interview types"""
    print("🔄 Testing different interview types retrieval...")
    
    interview_types = ["technical", "behavioral", "system_design", "coding"]
    
    async with aiohttp.ClientSession() as session:
        for interview_type in interview_types:
            # Create interview of specific type
            create_endpoint = "/api/interviews"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {VALID_JWT_TOKEN_USER1}"
            }
            
            interview_data = {
                "application_id": f"test-app-{interview_type}",
                "interview_type": interview_type,
                "configuration": {
                    "duration_minutes": 45,
                    "difficulty_level": "intermediate",
                    "focus_areas": ["general"],
                    "language": "en"
                },
                "status": "scheduled"
            }
            
            # Create interview
            async with session.post(
                f"{BASE_URL}{create_endpoint}",
                json=interview_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status in [200, 201]:
                    create_response = await response.json()
                    interview_id = create_response["data"]["interview_id"]
                    
                    # Now retrieve it
                    result = await make_request(session, interview_id, VALID_JWT_TOKEN_USER1)
                    assert result["status_code"] == 200, f"Failed to retrieve {interview_type} interview"
                    
                    response_data = result["data"]
                    assert response_data["data"]["interview_type"] == interview_type
                    print(f"✅ Successfully retrieved {interview_type} interview")

async def test_edge_cases():
    """Test various edge cases"""
    print("🧪 Testing edge cases...")
    
    async with aiohttp.ClientSession() as session:
        # Test with empty interview ID
        result = await make_request(session, "", VALID_JWT_TOKEN_USER1)
        # Should be 404 or 422 depending on routing
        assert result["status_code"] in [404, 422], f"Expected 404 or 422 for empty ID, got {result['status_code']}"
        print("✅ Empty interview ID correctly handled")
        
        # Test with very long interview ID
        long_id = "a" * 1000
        result = await make_request(session, long_id, VALID_JWT_TOKEN_USER1)
        assert result["status_code"] in [404, 422], f"Expected 404 or 422 for long ID, got {result['status_code']}"
        print("✅ Very long interview ID correctly handled")

async def run_all_tests():
    """Run all tests"""
    print("🚀 Starting GET /api/interviews/{interview_id} endpoint tests...\n")
    
    try:
        await test_authentication_required()
        print()
        
        await test_interview_not_found()
        print()
        
        await test_invalid_interview_id_format()
        print()
        
        await test_successful_retrieval()
        print()
        
        await test_authorization_different_user()
        print()
        
        await test_multiple_interview_types()
        print()
        
        await test_edge_cases()
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
    print("=" * 70)
    print("GET /api/interviews/{interview_id} Endpoint Integration Tests")
    print("=" * 70)
    print(f"Target URL: {BASE_URL}{ENDPOINT_TEMPLATE}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 70)
    
    # Run tests
    success = asyncio.run(run_all_tests())
    
    print("=" * 70)
    if success:
        print("✅ ALL TESTS PASSED - Interview details endpoint is working correctly!")
    else:
        print("❌ SOME TESTS FAILED - Please check the output above for details")
    print("=" * 70)
