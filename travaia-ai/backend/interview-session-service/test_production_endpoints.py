#!/usr/bin/env python3
"""
Production endpoint testing for TRAVAIA Interview Session Service
Tests all interview endpoints against the deployed Cloud Run service
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, List

# Production configuration
PROD_BASE_URL = "https://travaia-interview-session-service-3666tidp6a-uc.a.run.app"
BACKUP_URL = "https://travaia-application-job-service-3666tidp6a-uc.a.run.app"

# Test JWT tokens (replace with actual production tokens)
VALID_JWT_TOKEN_USER1 = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzM4MjQifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vdHJhdmFpYS1lMTMxMCIsImF1ZCI6InRyYXZhaWEtZTEzMTAiLCJhdXRoX3RpbWUiOjE3MzQ5ODk4NzAsInVzZXJfaWQiOiJ0ZXN0LXVzZXItMTIzIiwic3ViIjoidGVzdC11c2VyLTEyMyIsImlhdCI6MTczNDk4OTg3MCwiZXhwIjoxNzM0OTkzNDcwLCJlbWFpbCI6InRlc3R1c2VyQGV4YW1wbGUuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGVzdHVzZXJAZXhhbXBsZS5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ"

# Global variables to store created resources
created_interview_id = None
created_attempt_ids = []

async def make_request(session: aiohttp.ClientSession, method: str, endpoint: str, token: str = None, data: Dict[str, Any] = None, params: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make HTTP request to production endpoint"""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{PROD_BASE_URL}{endpoint}"
    
    try:
        async with session.request(
            method,
            url,
            json=data,
            headers=headers,
            params=params,
            timeout=aiohttp.ClientTimeout(total=30)
        ) as response:
            try:
                response_data = await response.json()
            except:
                response_data = {"text": await response.text()}
            
            return {
                "status_code": response.status,
                "data": response_data,
                "headers": dict(response.headers),
                "url": str(response.url)
            }
    except Exception as e:
        return {
            "status_code": 0,
            "data": {"error": str(e)},
            "headers": {},
            "url": url
        }

async def test_service_health():
    """Test service health endpoints"""
    print("🏥 Testing service health...")
    
    async with aiohttp.ClientSession() as session:
        # Test root endpoint
        result = await make_request(session, "GET", "/")
        print(f"   Root endpoint: {result['status_code']} - {result.get('data', {}).get('message', 'No message')}")
        
        # Test health endpoint
        result = await make_request(session, "GET", "/health")
        print(f"   Health endpoint: {result['status_code']} - {result.get('data', {}).get('status', 'No status')}")
        
        # Test detailed health
        result = await make_request(session, "GET", "/health/detailed")
        print(f"   Detailed health: {result['status_code']}")
        
        print("✅ Health check completed")

async def test_post_interview():
    """Test POST /api/interviews endpoint"""
    global created_interview_id
    print("📝 Testing POST /api/interviews...")
    
    interview_data = {
        "application_id": "prod-test-app-123",
        "interview_type": "technical",
        "configuration": {
            "duration_minutes": 60,
            "difficulty_level": "intermediate",
            "focus_areas": ["algorithms", "data_structures"],
            "language": "en"
        },
        "status": "scheduled"
    }
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, "POST", "/api/interviews", VALID_JWT_TOKEN_USER1, interview_data)
        
        if result["status_code"] in [200, 201]:
            created_interview_id = result["data"]["data"]["interview_id"]
            print(f"✅ Interview created successfully: {created_interview_id}")
            return True
        else:
            print(f"❌ Interview creation failed: {result['status_code']} - {result['data']}")
            return False

async def test_get_interview():
    """Test GET /api/interviews/{interview_id} endpoint"""
    if not created_interview_id:
        print("❌ No interview ID available for GET test")
        return False
    
    print(f"📖 Testing GET /api/interviews/{created_interview_id}...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, "GET", f"/api/interviews/{created_interview_id}", VALID_JWT_TOKEN_USER1)
        
        if result["status_code"] == 200:
            interview_data = result["data"]["data"]
            print(f"✅ Interview retrieved successfully: {interview_data['interview_type']}")
            return True
        else:
            print(f"❌ Interview retrieval failed: {result['status_code']} - {result['data']}")
            return False

async def test_get_user_interviews():
    """Test GET /api/interviews endpoint (user's interviews)"""
    print("📋 Testing GET /api/interviews (user interviews)...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, "GET", "/api/interviews", VALID_JWT_TOKEN_USER1)
        
        if result["status_code"] == 200:
            interviews = result["data"]["data"]
            print(f"✅ User interviews retrieved successfully: {len(interviews)} interviews")
            return True
        else:
            print(f"❌ User interviews retrieval failed: {result['status_code']} - {result['data']}")
            return False

async def test_post_interview_attempt():
    """Test POST /api/interviews/{interview_id}/attempts endpoint"""
    global created_attempt_ids
    if not created_interview_id:
        print("❌ No interview ID available for attempt creation test")
        return False
    
    print(f"🎯 Testing POST /api/interviews/{created_interview_id}/attempts...")
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, "POST", f"/api/interviews/{created_interview_id}/attempts", VALID_JWT_TOKEN_USER1, {})
        
        if result["status_code"] in [200, 201]:
            attempt_id = result["data"]["data"]["attempt_id"]
            created_attempt_ids.append(attempt_id)
            print(f"✅ Interview attempt created successfully: {attempt_id}")
            return True
        else:
            print(f"❌ Interview attempt creation failed: {result['status_code']} - {result['data']}")
            return False

async def test_get_interview_attempts():
    """Test GET /api/interviews/{interview_id}/attempts endpoint"""
    if not created_interview_id:
        print("❌ No interview ID available for attempts retrieval test")
        return False
    
    print(f"📊 Testing GET /api/interviews/{created_interview_id}/attempts...")
    
    async with aiohttp.ClientSession() as session:
        # Test default pagination
        result = await make_request(session, "GET", f"/api/interviews/{created_interview_id}/attempts", VALID_JWT_TOKEN_USER1)
        
        if result["status_code"] == 200:
            attempts = result["data"]["data"]
            pagination = result["data"]["pagination"]
            print(f"✅ Interview attempts retrieved successfully: {len(attempts)} attempts, total: {pagination['total']}")
            
            # Test with pagination parameters
            result_paginated = await make_request(
                session, 
                "GET", 
                f"/api/interviews/{created_interview_id}/attempts", 
                VALID_JWT_TOKEN_USER1,
                params={"page": 1, "limit": 5}
            )
            
            if result_paginated["status_code"] == 200:
                print(f"✅ Paginated attempts retrieval successful")
                return True
            else:
                print(f"❌ Paginated attempts retrieval failed: {result_paginated['status_code']}")
                return False
        else:
            print(f"❌ Interview attempts retrieval failed: {result['status_code']} - {result['data']}")
            return False

async def test_put_interview_attempt():
    """Test PUT /api/interviews/{interview_id}/attempts/{attempt_id} endpoint"""
    if not created_interview_id or not created_attempt_ids:
        print("❌ No interview ID or attempt ID available for update test")
        return False
    
    attempt_id = created_attempt_ids[0]
    print(f"✏️ Testing PUT /api/interviews/{created_interview_id}/attempts/{attempt_id}...")
    
    update_data = {
        "status": "completed",
        "score": 85,
        "end_time": datetime.now(timezone.utc).isoformat(),
        "recording_url": "https://example.com/recording.mp4",
        "feedback_report_id": "feedback-prod-test-123"
    }
    
    async with aiohttp.ClientSession() as session:
        result = await make_request(
            session, 
            "PUT", 
            f"/api/interviews/{created_interview_id}/attempts/{attempt_id}", 
            VALID_JWT_TOKEN_USER1, 
            update_data
        )
        
        if result["status_code"] == 200:
            updated_attempt = result["data"]["data"]
            print(f"✅ Interview attempt updated successfully: status={updated_attempt['status']}, score={updated_attempt['score']}")
            return True
        else:
            print(f"❌ Interview attempt update failed: {result['status_code']} - {result['data']}")
            return False

async def test_interview_questions_endpoints():
    """Test interview questions endpoints"""
    print("❓ Testing interview questions endpoints...")
    
    # Test GET interview questions
    async with aiohttp.ClientSession() as session:
        result = await make_request(session, "GET", "/api/interview-questions", VALID_JWT_TOKEN_USER1)
        
        if result["status_code"] == 200:
            questions = result["data"]["data"]
            print(f"✅ Interview questions retrieved successfully: {len(questions)} question sets")
        else:
            print(f"❌ Interview questions retrieval failed: {result['status_code']} - {result['data']}")
        
        # Test POST interview questions
        question_data = {
            "name": "Production Test Questions",
            "language": "en",
            "questions": [
                "Tell me about yourself",
                "What are your strengths?",
                "Describe a challenging project you worked on"
            ]
        }
        
        result = await make_request(session, "POST", "/api/interview-questions", VALID_JWT_TOKEN_USER1, question_data)
        
        if result["status_code"] in [200, 201]:
            question_set = result["data"]["data"]
            print(f"✅ Interview question set created successfully: {question_set['question_set_id']}")
            return question_set['question_set_id']
        else:
            print(f"❌ Interview question set creation failed: {result['status_code']} - {result['data']}")
            return None

async def test_authentication_errors():
    """Test authentication error handling"""
    print("🔐 Testing authentication error handling...")
    
    async with aiohttp.ClientSession() as session:
        # Test without token
        result = await make_request(session, "GET", "/api/interviews")
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Unauthenticated request correctly rejected (401)")
        
        # Test with invalid token
        result = await make_request(session, "GET", "/api/interviews", "invalid.jwt.token")
        assert result["status_code"] == 401, f"Expected 401, got {result['status_code']}"
        print("✅ Invalid token correctly rejected (401)")

async def test_rate_limiting():
    """Test rate limiting functionality"""
    print("⏱️ Testing rate limiting...")
    
    if not created_interview_id:
        print("❌ No interview ID available for rate limiting test")
        return
    
    async with aiohttp.ClientSession() as session:
        # Make multiple rapid requests
        tasks = []
        for i in range(35):  # Exceed the 30/minute limit
            task = make_request(session, "GET", f"/api/interviews/{created_interview_id}", VALID_JWT_TOKEN_USER1)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
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
        
        if rate_limited_count > 0:
            print("✅ Rate limiting is working correctly")
        else:
            print("⚠️ Rate limiting may not be working as expected")

async def run_comprehensive_production_tests():
    """Run all production endpoint tests"""
    print("🚀 Starting comprehensive production endpoint testing...")
    print(f"🎯 Target URL: {PROD_BASE_URL}")
    print(f"🕒 Started at: {datetime.now().isoformat()}")
    print("=" * 80)
    
    test_results = {
        "passed": 0,
        "failed": 0,
        "total": 0
    }
    
    try:
        # Health checks
        await test_service_health()
        print()
        
        # Core interview endpoints
        if await test_post_interview():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        if await test_get_interview():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        if await test_get_user_interviews():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        # Interview attempts endpoints
        if await test_post_interview_attempt():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        if await test_get_interview_attempts():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        if await test_put_interview_attempt():
            test_results["passed"] += 1
        else:
            test_results["failed"] += 1
        test_results["total"] += 1
        print()
        
        # Interview questions endpoints
        await test_interview_questions_endpoints()
        print()
        
        # Security and rate limiting tests
        await test_authentication_errors()
        print()
        
        await test_rate_limiting()
        print()
        
        # Summary
        print("=" * 80)
        print("📊 PRODUCTION TEST RESULTS")
        print("=" * 80)
        print(f"✅ Passed: {test_results['passed']}")
        print(f"❌ Failed: {test_results['failed']}")
        print(f"📊 Total: {test_results['total']}")
        print(f"🎯 Success Rate: {(test_results['passed'] / test_results['total'] * 100):.1f}%")
        
        if created_interview_id:
            print(f"🆔 Created Interview ID: {created_interview_id}")
        if created_attempt_ids:
            print(f"🎯 Created Attempt IDs: {', '.join(created_attempt_ids)}")
        
        print("=" * 80)
        
        if test_results["failed"] == 0:
            print("🎉 ALL PRODUCTION TESTS PASSED!")
            print("✅ Interview Session Service is fully operational in production")
        else:
            print("⚠️ SOME TESTS FAILED - Please review the output above")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"💥 Unexpected error during testing: {e}")
        return False
    
    return test_results["failed"] == 0

if __name__ == "__main__":
    print("TRAVAIA Interview Session Service - Production Endpoint Testing")
    print("=" * 80)
    
    # Run comprehensive tests
    success = asyncio.run(run_comprehensive_production_tests())
    
    if success:
        exit(0)
    else:
        exit(1)
