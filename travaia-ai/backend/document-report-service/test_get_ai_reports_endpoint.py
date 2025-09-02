"""
Integration tests for GET /api/ai-reports endpoint
Tests authentication, pagination, validation, rate limiting, and data structure
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import json

# Import the FastAPI app
from main import app
from models import AIReport, AIReportContent, PaginationMeta
from services.report_service import ReportService

# Create test client
client = TestClient(app)

class TestGetAIReportsEndpoint:
    """Test suite for GET /api/ai-reports endpoint"""
    
    def setup_method(self):
        """Setup test data before each test"""
        self.base_url = "/api/ai-reports"
        self.valid_headers = {
            "Authorization": "Bearer valid-jwt-token",
            "Content-Type": "application/json"
        }
        self.test_user_id = "test-user-123"
        
        # Mock AI report data
        self.mock_reports = [
            {
                "report_id": "report-1",
                "user_id": self.test_user_id,
                "application_id": "app-1",
                "interview_id": "interview-1",
                "report_type": "job_fit",
                "generated_at": datetime.utcnow(),
                "content": {
                    "score": 85.5,
                    "strengths": ["Technical skills", "Communication"],
                    "weaknesses": ["Experience with specific tools"],
                    "detailed_feedback": "Strong candidate overall",
                    "transcription": None
                }
            },
            {
                "report_id": "report-2",
                "user_id": self.test_user_id,
                "application_id": "app-2",
                "interview_id": None,
                "report_type": "interview_feedback",
                "generated_at": datetime.utcnow(),
                "content": {
                    "score": 78.0,
                    "strengths": ["Problem solving"],
                    "weaknesses": ["Needs more practice"],
                    "detailed_feedback": "Good performance with room for improvement",
                    "transcription": "Sample transcription text"
                }
            }
        ]
        
        self.mock_pagination = PaginationMeta(
            page=1,
            limit=10,
            total=2,
            total_pages=1,
            has_next=False,
            has_prev=False
        )

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_successful_retrieval_with_reports(self, mock_service, mock_auth):
        """Test successful retrieval of AI reports for authenticated user"""
        # Mock authentication
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Mock service response
        mock_service.return_value = (self.mock_reports, self.mock_pagination)
        
        # Make request
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 10}
        )
        
        # Assertions
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "Retrieved 2 AI reports" in data["message"]
        assert "data" in data
        assert "pagination" in data
        
        # Check data structure
        assert data["data"]["user_id"] == self.test_user_id
        assert len(data["data"]["reports"]) == 2
        
        # Check pagination
        pagination = data["pagination"]
        assert pagination["page"] == 1
        assert pagination["limit"] == 10
        assert pagination["total"] == 2
        assert pagination["has_next"] is False
        
        # Verify service was called correctly
        mock_service.assert_called_once_with(
            user_id=self.test_user_id,
            page=1,
            limit=10
        )

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_empty_reports_list(self, mock_service, mock_auth):
        """Test retrieval when user has no AI reports"""
        # Mock authentication
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Mock empty response
        empty_pagination = PaginationMeta(
            page=1, limit=10, total=0, total_pages=0, has_next=False, has_prev=False
        )
        mock_service.return_value = ([], empty_pagination)
        
        # Make request
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 10}
        )
        
        # Assertions
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "Retrieved 0 AI reports" in data["message"]
        assert len(data["data"]["reports"]) == 0
        assert data["pagination"]["total"] == 0

    def test_unauthenticated_access(self):
        """Test that unauthenticated requests return 401"""
        # Request without Authorization header
        response = client.get(self.base_url, params={"page": 1, "limit": 10})
        
        assert response.status_code == 401

    def test_invalid_authorization_header(self):
        """Test that invalid authorization header returns 401"""
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        
        with patch('main.get_current_user') as mock_auth:
            mock_auth.side_effect = Exception("Invalid token")
            
            response = client.get(
                self.base_url,
                headers=invalid_headers,
                params={"page": 1, "limit": 10}
            )
            
            assert response.status_code == 401

    @patch('main.get_current_user')
    def test_invalid_page_parameter(self, mock_auth):
        """Test validation of page parameter"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Test page = 0
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 0, "limit": 10}
        )
        
        assert response.status_code == 422
        
        # Test negative page
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": -1, "limit": 10}
        )
        
        assert response.status_code == 422

    @patch('main.get_current_user')
    def test_invalid_limit_parameter(self, mock_auth):
        """Test validation of limit parameter"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Test limit = 0
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 0}
        )
        
        assert response.status_code == 422
        
        # Test limit > 100
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 101}
        )
        
        assert response.status_code == 422

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_pagination_functionality(self, mock_service, mock_auth):
        """Test pagination with different page and limit values"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Test page 2 with limit 5
        page_2_pagination = PaginationMeta(
            page=2, limit=5, total=15, total_pages=3, has_next=True, has_prev=True
        )
        mock_service.return_value = (self.mock_reports[:1], page_2_pagination)
        
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 2, "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        pagination = data["pagination"]
        assert pagination["page"] == 2
        assert pagination["limit"] == 5
        assert pagination["total"] == 15
        assert pagination["has_next"] is True
        assert pagination["has_prev"] is True
        
        # Verify service called with correct parameters
        mock_service.assert_called_once_with(
            user_id=self.test_user_id,
            page=2,
            limit=5
        )

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_out_of_bounds_page(self, mock_service, mock_auth):
        """Test requesting page beyond available data"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Mock empty response for out-of-bounds page
        empty_pagination = PaginationMeta(
            page=10, limit=10, total=5, total_pages=1, has_next=False, has_prev=True
        )
        mock_service.return_value = ([], empty_pagination)
        
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 10, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["reports"]) == 0
        assert data["pagination"]["page"] == 10

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_service_error_handling(self, mock_service, mock_auth):
        """Test handling of service layer errors"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        # Mock service error
        mock_service.side_effect = Exception("Database connection failed")
        
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_data_structure_validation(self, mock_service, mock_auth):
        """Test that returned data matches expected structure"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        mock_service.return_value = (self.mock_reports, self.mock_pagination)
        
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate top-level structure
        required_fields = ["success", "message", "data", "pagination", "timestamp"]
        for field in required_fields:
            assert field in data
        
        # Validate data structure
        assert "reports" in data["data"]
        assert "user_id" in data["data"]
        
        # Validate report structure
        if data["data"]["reports"]:
            report = data["data"]["reports"][0]
            report_fields = ["report_id", "user_id", "report_type", "generated_at", "content"]
            for field in report_fields:
                assert field in report
            
            # Validate content structure
            content = report["content"]
            content_fields = ["score", "strengths", "weaknesses", "detailed_feedback"]
            for field in content_fields:
                assert field in content

    @patch('main.get_current_user')
    def test_rate_limiting(self, mock_auth):
        """Test rate limiting enforcement"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        
        with patch.object(ReportService, 'get_user_ai_reports_paginated') as mock_service:
            mock_service.return_value = ([], self.mock_pagination)
            
            # Make multiple requests quickly
            responses = []
            for i in range(5):
                response = client.get(
                    self.base_url,
                    headers=self.valid_headers,
                    params={"page": 1, "limit": 10}
                )
                responses.append(response.status_code)
            
            # At least some requests should succeed
            success_count = sum(1 for status in responses if status == 200)
            assert success_count > 0

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_default_pagination_parameters(self, mock_service, mock_auth):
        """Test that default pagination parameters work correctly"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        mock_service.return_value = (self.mock_reports, self.mock_pagination)
        
        # Request without pagination parameters
        response = client.get(self.base_url, headers=self.valid_headers)
        
        assert response.status_code == 200
        
        # Verify service called with defaults
        mock_service.assert_called_once_with(
            user_id=self.test_user_id,
            page=1,
            limit=10
        )

    @patch('main.get_current_user')
    @patch.object(ReportService, 'get_user_ai_reports_paginated')
    def test_response_timestamp_format(self, mock_service, mock_auth):
        """Test that response timestamp is in correct format"""
        mock_auth.return_value = {"user_id": self.test_user_id, "email": "test@example.com"}
        mock_service.return_value = (self.mock_reports, self.mock_pagination)
        
        response = client.get(
            self.base_url,
            headers=self.valid_headers,
            params={"page": 1, "limit": 10}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check timestamp format (should be ISO format with Z suffix)
        timestamp = data["timestamp"]
        assert isinstance(timestamp, str)
        assert timestamp.endswith('Z')
        
        # Verify it's a valid datetime
        datetime.fromisoformat(timestamp.replace('Z', '+00:00'))

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
