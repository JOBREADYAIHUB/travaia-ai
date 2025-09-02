#!/usr/bin/env python3
"""
Integration tests for POST /api/interviews endpoint
Tests authentication, validation, rate limiting, and successful interview session creation
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8080"
ENDPOINT = "/api/interviews"

# Mock JWT tokens for testing (replace with actual test tokens)
VALID_JWT_TOKEN = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItMTIzIiwic3ViIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdHVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ"
INVALID_JWT_TOKEN = "invalid.jwt.token"

# Test data
VALID_INTERVIEW_REQUEST = {
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

INVALID_INTERVIEW_REQUEST_MISSING_FIELDS = {
    "interview_type": "technical",
    "status": "scheduled"
    # Missing required application_id and configuration
}

INVALID_INTERVIEW_REQUEST_INVALID_TYPE = {
    "application_id": "test-app-123",
    "interview_type": "invalid_type",  # Invalid enum value
    "configuration": {
        "duration_minutes": 60,
        "difficulty_level": "intermediate",
        "focus_areas": ["algorithms"],
        "language": "en"
    },
    "status": "scheduled"
}

async def make_request(session: aiohttp.ClientSession, data: Dict[str, Any], token: str = None) -> Dict[str, Any]:
    """Make HTTP request to the endpoint"""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        async with session.post(
            f"{BASE_URL}{ENDPOINT}",
            json=data,
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

async def test_authentication_required():
    """Test that authentication is required"""
    print("🔐 Testing authentication requirement...")
    
    async with aiohttp.ClientSession() as session:
        # Test without token
        result = await make_request(session, VALID_INTERVIEW_REQUEST)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request without token correctly rejected (401)")
        
        # Test with invalid token
        result = await make_request(session, VALID_INTERVIEW_REQUEST, INVALID_JWT_TOKEN)
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Request with invalid token correctly rejected (401)")

async def test_request_validation():
    """Test request validation"""
    print("📝 Testing request validation...")
    
    async with aiohttp.ClientSession() as session:
        # Test missing required fields
        result = await make_request(session, INVALID_INTERVIEW_REQUEST_MISSING_FIELDS, VALID_JWT_TOKEN)
        assert result["status_code"] == 422, f"Expected 422, got {result['status_code']}"
        assert "validation" in result["data"].get("detail", "").lower()
        print("✅ Missing required fields correctly rejected (422)")
        
        # Test invalid enum value
        result = await make_request(session, INVALID_INTERVIEW_REQUEST_INVALID_TYPE, VALID_JWT_TOKEN)
        assert result["status_code"] == 422, f"Expected 422, got {result['status_code']}"
        print("✅ Invalid enum value correctly rejected (422)")
        
        # Test empty request body
        result = await make_request(session, {}, VALID_JWT_TOKEN)
        assert result["status_code"] == 422, f"Expected 422, got {result['status_code']}"
        print("✅ Empty request body correctly rejected (422)")

async def test_successful_creation():
    """Test successful interview session creation"""
    print("✨ Testing successful interview session creation...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, VALID_INTERVIEW_REQUEST, VALID_JWT_TOKEN)
        
        # Should succeed (200 or 201)
        assert result["status_code"] in [200, 201], f"Expected 200/201, got {result['status_code']}"
        
        # Validate response structure
        response_data = result["data"]
        assert "success" in response_data, "Response missing 'success' field"
        assert response_data["success"] is True, "Success should be True"
        assert "data" in response_data, "Response missing 'data' field"
        assert "message" in response_data, "Response missing 'message' field"
        
        # Validate interview data structure
        interview_data = response_data["data"]
        assert "interview_id" in interview_data, "Interview data missing 'interview_id'"
        assert "user_id" in interview_data, "Interview data missing 'user_id'"
        assert "application_id" in interview_data, "Interview data missing 'application_id'"
        assert "interview_type" in interview_data, "Interview data missing 'interview_type'"
        assert "configuration" in interview_data, "Interview data missing 'configuration'"
        assert "status" in interview_data, "Interview data missing 'status'"
        assert "created_at" in interview_data, "Interview data missing 'created_at'"
        assert "updated_at" in interview_data, "Interview data missing 'updated_at'"
        
        # Validate field values
        assert interview_data["application_id"] == VALID_INTERVIEW_REQUEST["application_id"]
        assert interview_data["interview_type"] == VALID_INTERVIEW_REQUEST["interview_type"]
        assert interview_data["status"] == VALID_INTERVIEW_REQUEST["status"]
        assert interview_data["configuration"] == VALID_INTERVIEW_REQUEST["configuration"]
        
        # Validate timestamps are valid ISO format
        try:
            datetime.fromisoformat(interview_data["created_at"].replace('Z', '+00:00'))
            datetime.fromisoformat(interview_data["updated_at"].replace('Z', '+00:00'))
        except ValueError:
            assert False, "Invalid timestamp format in response"
        
        print(f"✅ Interview session created successfully with ID: {interview_data['interview_id']}")
        print(f"   - Application ID: {interview_data['application_id']}")
        print(f"   - Interview Type: {interview_data['interview_type']}")
        print(f"   - Status: {interview_data['status']}")
        print(f"   - Created At: {interview_data['created_at']}")

async def test_rate_limiting():
    """Test rate limiting (30 requests per minute)"""
    print("⏱️ Testing rate limiting...")
    
    async with aiohttp.ClientSession() as session:
        # Make multiple rapid requests
        tasks = []
        for i in range(35):  # Exceed the 30/minute limit
            task = make_request(session, VALID_INTERVIEW_REQUEST, VALID_JWT_TOKEN)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Count successful and rate-limited responses
        success_count = 0
        rate_limited_count = 0
        
        for result in results:
            if isinstance(result, dict):
                if result["status_code"] in [200, 201]:
                    success_count += 1
                elif result["status_code"] == 429:
                    rate_limited_count += 1
        
        print(f"   - Successful requests: {success_count}")
        print(f"   - Rate limited requests: {rate_limited_count}")
        
        # Should have some rate-limited requests
        assert rate_limited_count > 0, "Expected some requests to be rate limited"
        print("✅ Rate limiting is working correctly")

async def test_different_interview_types():
    """Test creation with different interview types"""
    print("🔄 Testing different interview types...")
    
    interview_types = ["technical", "behavioral", "system_design", "coding"]
    
    async with aiohttp.ClientSession() as session:
        for interview_type in interview_types:
            request_data = VALID_INTERVIEW_REQUEST.copy()
            request_data["interview_type"] = interview_type
            
            result = await make_request(session, request_data, VALID_JWT_TOKEN)
            assert result["status_code"] in [200, 201], f"Failed for interview type: {interview_type}"
            
            response_data = result["data"]
            assert response_data["data"]["interview_type"] == interview_type
            print(f"✅ Successfully created {interview_type} interview")

async def test_configuration_variations():
    """Test different configuration options"""
    print("⚙️ Testing configuration variations...")
    
    configurations = [
        {
            "duration_minutes": 30,
            "difficulty_level": "beginner",
            "focus_areas": ["basics"],
            "language": "en"
        },
        {
            "duration_minutes": 90,
            "difficulty_level": "advanced",
            "focus_areas": ["algorithms", "data_structures", "system_design"],
            "language": "es"
        },
        {
            "duration_minutes": 45,
            "difficulty_level": "intermediate",
            "focus_areas": ["problem_solving"],
            "language": "fr"
        }
    ]
    
    async with aiohttp.ClientSession() as session:
        for i, config in enumerate(configurations):
            request_data = VALID_INTERVIEW_REQUEST.copy()
            request_data["configuration"] = config
            request_data["application_id"] = f"test-app-config-{i}"
            
            result = await make_request(session, request_data, VALID_JWT_TOKEN)
            assert result["status_code"] in [200, 201], f"Failed for configuration: {config}"
            
            response_data = result["data"]
            assert response_data["data"]["configuration"] == config
            print(f"✅ Successfully created interview with {config['difficulty_level']} difficulty")

async def run_all_tests():
    """Run all tests"""
    print("🚀 Starting POST /api/interviews endpoint tests...\n")
    
    try:
        await test_authentication_required()
        print()
        
        await test_request_validation()
        print()
        
        await test_successful_creation()
        print()
        
        await test_different_interview_types()
        print()
        
        await test_configuration_variations()
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
    print("=" * 60)
    print("POST /api/interviews Endpoint Integration Tests")
    print("=" * 60)
    print(f"Target URL: {BASE_URL}{ENDPOINT}")
    print(f"Test started at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    # Run tests
    success = asyncio.run(run_all_tests())
    
    print("=" * 60)
    if success:
        print("✅ ALL TESTS PASSED - Interview session creation endpoint is working correctly!")
    else:
        print("❌ SOME TESTS FAILED - Please check the output above for details")
    print("=" * 60)
