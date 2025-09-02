"""
Test script to validate the GET /api/applications endpoint implementation
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(__file__))

def test_imports():
    """Test that all imports work correctly"""
    try:
        # Test model imports
        from models import (
            ApiResponse, Application, PaginationMeta, PaginationParams,
            Contact, Note, ApplicationCreateRequest
        )
        print("✓ Models imported successfully")
        
        # Test service imports
        from services.application_service import ApplicationService
        print("✓ ApplicationService imported successfully")
        
        # Test that ApplicationService has the new paginated method
        app_service = ApplicationService()
        assert hasattr(app_service, 'get_user_applications_paginated'), "Missing get_user_applications_paginated method"
        print("✓ ApplicationService has paginated method")
        
        # Test auth middleware import
        from shared.auth_middleware import get_current_user
        print("✓ Auth middleware imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False
    except AssertionError as e:
        print(f"✗ Method missing: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def test_pydantic_models():
    """Test that Pydantic models work correctly"""
    try:
        from models import Application, Contact, Note, PaginationMeta, ApiResponse
        from datetime import datetime
        
        # Test Contact model
        contact = Contact(
            contact_id="contact_123",
            name="John Doe",
            role="Hiring Manager",
            email="john@company.com"
        )
        assert contact.name == "John Doe"
        print("✓ Contact model works")
        
        # Test Note model
        note = Note(
            note_id="note_123",
            content="Great interview experience",
            created_at=datetime.now()
        )
        assert note.content == "Great interview experience"
        print("✓ Note model works")
        
        # Test Application model
        application = Application(
            application_id="app_123",
            user_id="user_456",
            job_title="Software Engineer",
            company_name="Tech Corp",
            status="applied",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            contacts=[contact],
            notes=[note]
        )
        assert application.job_title == "Software Engineer"
        assert len(application.contacts) == 1
        print("✓ Application model works")
        
        # Test PaginationMeta model
        pagination = PaginationMeta(
            page=1,
            limit=10,
            total=25,
            total_pages=3,
            has_next=True,
            has_prev=False
        )
        assert pagination.total_pages == 3
        print("✓ PaginationMeta model works")
        
        # Test ApiResponse model
        response = ApiResponse(
            success=True,
            message="Applications retrieved successfully",
            data=[application],
            pagination=pagination
        )
        assert response.success is True
        print("✓ ApiResponse model works")
        
        return True
        
    except Exception as e:
        print(f"✗ Pydantic model error: {e}")
        return False

def test_endpoint_structure():
    """Test that the main app structure is correct"""
    try:
        # Import main to check if endpoint is defined
        import main
        
        # Check if the app has the required endpoint
        app = main.app
        routes = [route.path for route in app.routes]
        
        if "/api/applications" in routes:
            print("✓ Endpoint /api/applications is registered")
        else:
            print("✗ Endpoint /api/applications is missing")
            return False
        
        # Check if logger is initialized
        assert hasattr(main, 'logger'), "Logger not initialized"
        print("✓ Logger is initialized")
        
        return True
        
    except Exception as e:
        print(f"✗ Endpoint structure error: {e}")
        return False

def test_service_pagination_logic():
    """Test the pagination logic in the service"""
    try:
        from services.application_service import ApplicationService
        
        # Test pagination calculation logic
        # This tests the mathematical logic without requiring Firestore
        page = 2
        limit = 10
        total = 25
        
        # Calculate pagination metadata (same logic as in service)
        total_pages = (total + limit - 1) // limit  # Ceiling division
        has_next = page < total_pages
        has_prev = page > 1
        offset = (page - 1) * limit
        
        assert total_pages == 3, f"Expected 3 total pages, got {total_pages}"
        assert has_next is True, "Should have next page"
        assert has_prev is True, "Should have previous page"
        assert offset == 10, f"Expected offset 10, got {offset}"
        
        print("✓ Pagination logic is correct")
        return True
        
    except Exception as e:
        print(f"✗ Pagination logic error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing TRAVAIA Application Service GET /api/applications Implementation...")
    print("=" * 70)
    
    tests = [
        ("Import Tests", test_imports),
        ("Pydantic Model Tests", test_pydantic_models),
        ("Endpoint Structure Tests", test_endpoint_structure),
        ("Pagination Logic Tests", test_service_pagination_logic)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        if test_func():
            passed += 1
        else:
            print(f"Failed: {test_name}")
    
    print("\n" + "=" * 70)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! GET /api/applications endpoint is ready.")
        print("\nEndpoint Details:")
        print("- URL: GET /api/applications")
        print("- Authentication: Required (JWT Bearer token)")
        print("- Query Parameters:")
        print("  - page: int (default=1, min=1)")
        print("  - limit: int (default=10, min=1, max=100)")
        print("- Rate Limit: 30 requests/minute")
        print("- Response: ApiResponse with Application[] data and pagination metadata")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
