"""
Comprehensive integration tests for AI Reports CRUD API endpoints
Tests all CRUD operations: GET, POST, PUT, DELETE for /api/ai-reports
"""

import pytest
import asyncio
from httpx import AsyncClient
from datetime import datetime
from typing import Dict, Any
import json

# Test configuration
BASE_URL = "http://localhost:8000"
MOCK_JWT_TOKEN = "mock-jwt-token-for-testing"
TEST_USER_ID = "test-user-123"

# Mock auth headers
AUTH_HEADERS = {
    "Authorization": f"Bearer {MOCK_JWT_TOKEN}",
    "Content-Type": "application/json"
}

class TestAIReportsCRUD:
    """Test suite for AI Reports CRUD operations"""

    @pytest.fixture
    def sample_report_data(self) -> Dict[str, Any]:
        """Sample AI report data for testing"""
        return {
            "report_type": "interview_feedback",
            "content": {
                "score": 85.5,
                "strengths": [
                    "Strong technical knowledge",
                    "Clear communication",
                    "Problem-solving skills"
                ],
                "weaknesses": [
                    "Could improve on system design",
                    "Need more experience with microservices"
                ],
                "detailed_feedback": "Overall excellent performance with room for growth in architecture design.",
                "transcription": "Candidate demonstrated solid understanding of core concepts..."
            },
            "metadata": {
                "interview_duration": 45,
                "difficulty_level": "intermediate"
            }
        }

    @pytest.fixture
    def update_report_data(self) -> Dict[str, Any]:
        """Sample update data for testing"""
        return {
            "content": {
                "score": 90.0,
                "strengths": [
                    "Strong technical knowledge",
                    "Clear communication",
                    "Problem-solving skills",
                    "Excellent debugging approach"
                ],
                "weaknesses": [
                    "Could improve on system design"
                ],
                "detailed_feedback": "Significantly improved performance with better architecture understanding.",
                "transcription": "Updated transcription with additional insights..."
            },
            "metadata": {
                "interview_duration": 50,
                "difficulty_level": "advanced",
                "updated_by": "ai_system"
            }
        }

    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """Test that the service is running"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_create_ai_report_success(self, sample_report_data):
        """Test successful AI report creation"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=sample_report_data
            )
            
            assert response.status_code == 201
            data = response.json()
            
            # Validate response structure
            assert data["success"] is True
            assert data["message"] == "AI report created successfully"
            assert "data" in data
            assert "report" in data["data"]
            
            # Validate report data
            report = data["data"]["report"]
            assert "report_id" in report
            assert report["user_id"] == TEST_USER_ID
            assert report["report_type"] == sample_report_data["report_type"]
            assert "generated_at" in report
            
            # Validate content structure
            content = report["content"]
            assert content["score"] == sample_report_data["content"]["score"]
            assert content["strengths"] == sample_report_data["content"]["strengths"]
            assert content["weaknesses"] == sample_report_data["content"]["weaknesses"]
            
            return report["report_id"]  # Return for use in other tests

    @pytest.mark.asyncio
    async def test_create_ai_report_validation_error(self):
        """Test AI report creation with invalid data"""
        invalid_data = {
            "report_type": "",  # Empty report type
            "content": {
                "score": 150,  # Invalid score > 100
                "strengths": [],
                "weaknesses": []
            }
        }
        
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=invalid_data
            )
            
            assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_create_ai_report_unauthorized(self, sample_report_data):
        """Test AI report creation without authentication"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.post(
                "/api/ai-reports",
                json=sample_report_data
            )
            
            assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_ai_reports_paginated(self):
        """Test getting paginated AI reports"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.get(
                "/api/ai-reports?page=1&limit=10",
                headers=AUTH_HEADERS
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Validate response structure
            assert data["success"] is True
            assert "data" in data
            assert "reports" in data["data"]
            assert "pagination" in data
            
            # Validate pagination metadata
            pagination = data["pagination"]
            assert "page" in pagination
            assert "limit" in pagination
            assert "total" in pagination
            assert "total_pages" in pagination
            assert "has_next" in pagination
            assert "has_prev" in pagination

    @pytest.mark.asyncio
    async def test_get_ai_report_by_id_success(self):
        """Test getting a single AI report by ID"""
        # First create a report to test with
        sample_data = {
            "report_type": "job_fit_analysis",
            "content": {
                "score": 78.0,
                "strengths": ["Good match for role"],
                "weaknesses": ["Needs more experience"],
                "detailed_feedback": "Solid candidate with potential"
            }
        }
        
        async with AsyncClient(base_url=BASE_URL) as client:
            # Create report
            create_response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=sample_data
            )
            assert create_response.status_code == 201
            
            report_id = create_response.json()["data"]["report"]["report_id"]
            
            # Get report by ID
            get_response = await client.get(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            
            assert get_response.status_code == 200
            data = get_response.json()
            
            # Validate response
            assert data["success"] is True
            assert data["message"] == "AI report retrieved successfully"
            assert "data" in data
            assert "report" in data["data"]
            
            # Validate report data
            report = data["data"]["report"]
            assert report["report_id"] == report_id
            assert report["user_id"] == TEST_USER_ID
            assert report["report_type"] == sample_data["report_type"]

    @pytest.mark.asyncio
    async def test_get_ai_report_by_id_not_found(self):
        """Test getting non-existent AI report"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.get(
                "/api/ai-reports/non-existent-id",
                headers=AUTH_HEADERS
            )
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_ai_report_success(self, update_report_data):
        """Test successful AI report update"""
        # First create a report to update
        create_data = {
            "report_type": "interview_feedback",
            "content": {
                "score": 75.0,
                "strengths": ["Basic skills"],
                "weaknesses": ["Needs improvement"],
                "detailed_feedback": "Initial assessment"
            }
        }
        
        async with AsyncClient(base_url=BASE_URL) as client:
            # Create report
            create_response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=create_data
            )
            assert create_response.status_code == 201
            
            report_id = create_response.json()["data"]["report"]["report_id"]
            
            # Update report
            update_response = await client.put(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS,
                json=update_report_data
            )
            
            assert update_response.status_code == 200
            data = update_response.json()
            
            # Validate response
            assert data["success"] is True
            assert data["message"] == "AI report updated successfully"
            assert "data" in data
            assert "report" in data["data"]
            
            # Validate updated content
            report = data["data"]["report"]
            assert report["report_id"] == report_id
            assert report["content"]["score"] == update_report_data["content"]["score"]
            assert len(report["content"]["strengths"]) == len(update_report_data["content"]["strengths"])

    @pytest.mark.asyncio
    async def test_update_ai_report_not_found(self, update_report_data):
        """Test updating non-existent AI report"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.put(
                "/api/ai-reports/non-existent-id",
                headers=AUTH_HEADERS,
                json=update_report_data
            )
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_ai_report_success(self):
        """Test successful AI report deletion"""
        # First create a report to delete
        create_data = {
            "report_type": "test_report",
            "content": {
                "score": 80.0,
                "strengths": ["To be deleted"],
                "weaknesses": [],
                "detailed_feedback": "This report will be deleted"
            }
        }
        
        async with AsyncClient(base_url=BASE_URL) as client:
            # Create report
            create_response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=create_data
            )
            assert create_response.status_code == 201
            
            report_id = create_response.json()["data"]["report"]["report_id"]
            
            # Delete report
            delete_response = await client.delete(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            
            assert delete_response.status_code == 200
            data = delete_response.json()
            
            # Validate response
            assert data["success"] is True
            assert data["message"] == "AI report deleted successfully"
            assert data["data"]["report_id"] == report_id
            
            # Verify report is deleted by trying to get it
            get_response = await client.get(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_ai_report_not_found(self):
        """Test deleting non-existent AI report"""
        async with AsyncClient(base_url=BASE_URL) as client:
            response = await client.delete(
                "/api/ai-reports/non-existent-id",
                headers=AUTH_HEADERS
            )
            
            assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_rate_limiting(self, sample_report_data):
        """Test rate limiting on endpoints"""
        async with AsyncClient(base_url=BASE_URL) as client:
            # Test POST endpoint rate limiting (20/minute)
            tasks = []
            for _ in range(25):  # Exceed rate limit
                task = client.post(
                    "/api/ai-reports",
                    headers=AUTH_HEADERS,
                    json=sample_report_data
                )
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Check that some requests were rate limited
            rate_limited_count = sum(
                1 for response in responses 
                if hasattr(response, 'status_code') and response.status_code == 429
            )
            
            # Should have some rate limited responses
            assert rate_limited_count > 0

    @pytest.mark.asyncio
    async def test_full_crud_workflow(self):
        """Test complete CRUD workflow: Create -> Read -> Update -> Delete"""
        # Step 1: Create
        create_data = {
            "report_type": "full_workflow_test",
            "content": {
                "score": 70.0,
                "strengths": ["Initial strength"],
                "weaknesses": ["Initial weakness"],
                "detailed_feedback": "Initial feedback"
            }
        }
        
        async with AsyncClient(base_url=BASE_URL) as client:
            # Create
            create_response = await client.post(
                "/api/ai-reports",
                headers=AUTH_HEADERS,
                json=create_data
            )
            assert create_response.status_code == 201
            report_id = create_response.json()["data"]["report"]["report_id"]
            
            # Read
            read_response = await client.get(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            assert read_response.status_code == 200
            assert read_response.json()["data"]["report"]["report_id"] == report_id
            
            # Update
            update_data = {
                "content": {
                    "score": 85.0,
                    "strengths": ["Updated strength"],
                    "weaknesses": [],
                    "detailed_feedback": "Updated feedback"
                }
            }
            
            update_response = await client.put(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS,
                json=update_data
            )
            assert update_response.status_code == 200
            assert update_response.json()["data"]["report"]["content"]["score"] == 85.0
            
            # Delete
            delete_response = await client.delete(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            assert delete_response.status_code == 200
            
            # Verify deletion
            final_read_response = await client.get(
                f"/api/ai-reports/{report_id}",
                headers=AUTH_HEADERS
            )
            assert final_read_response.status_code == 404

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
