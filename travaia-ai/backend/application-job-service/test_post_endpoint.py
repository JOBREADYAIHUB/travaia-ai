"""
Test script to validate the POST /api/applications endpoint implementation
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(__file__))

def test_imports():
    """Test that all imports work correctly"""
    try:
        # Test model imports
        from models import ApplicationCreateRequest, ContactAddRequest, NoteAddRequest
        print("✓ Request models imported successfully")
        
        # Test service imports
        from services.application_service import ApplicationService
        print("✓ ApplicationService imported successfully")
        
        # Test that ApplicationService has the updated create method
        app_service = ApplicationService()
        assert hasattr(app_service, 'create_application'), "Missing create_application method"
        print("✓ ApplicationService has create_application method")
        
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

def test_request_models():
    """Test that request Pydantic models work correctly"""
    try:
        from models import ApplicationCreateRequest, ContactAddRequest, NoteAddRequest
        from datetime import datetime
        
        # Test ContactAddRequest model
        contact = ContactAddRequest(
            name="John Doe",
            role="Hiring Manager",
            email="john@company.com",
            phone="+1-555-0123"
        )
        assert contact.name == "John Doe"
        print("✓ ContactAddRequest model works")
        
        # Test NoteAddRequest model
        note = NoteAddRequest(
            content="Great company culture"
        )
        assert note.content == "Great company culture"
        print("✓ NoteAddRequest model works")
        
        # Test ApplicationCreateRequest model
        application_request = ApplicationCreateRequest(
            job_title="Senior Software Engineer",
            company_name="Tech Innovations Inc",
            job_description="Exciting role in AI development",
            link_to_job_post="https://company.com/jobs/123",
            status="applied",
            application_date=datetime.now(),
            contacts=[contact],
            notes=[note]
        )
        assert application_request.job_title == "Senior Software Engineer"
        assert len(application_request.contacts) == 1
        assert len(application_request.notes) == 1
        print("✓ ApplicationCreateRequest model works")
        
        # Test validation
        try:
            # Should fail with empty job_title
            invalid_request = ApplicationCreateRequest(
                job_title="",
                company_name="Tech Corp"
            )
            print("✗ Validation should have failed for empty job_title")
            return False
        except:
            print("✓ Validation works correctly for empty fields")
        
        return True
        
    except Exception as e:
        print(f"✗ Request model error: {e}")
        return False

def test_endpoint_registration():
    """Test that the POST endpoint is registered"""
    try:
        # Import main to check if endpoint is defined
        import main
        
        # Check if the app has the required endpoint
        app = main.app
        routes = [route.path for route in app.routes if hasattr(route, 'path')]
        
        if "/api/applications" in routes:
            print("✓ POST endpoint /api/applications is registered")
            
            # Check for both GET and POST methods
            application_routes = [route for route in app.routes 
                                if hasattr(route, 'path') and route.path == "/api/applications"]
            
            methods = []
            for route in application_routes:
                if hasattr(route, 'methods'):
                    methods.extend(route.methods)
            
            if "GET" in methods and "POST" in methods:
                print("✓ Both GET and POST methods available")
            else:
                print(f"✗ Available methods: {methods}")
                return False
        else:
            print("✗ Endpoint /api/applications is missing")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Endpoint registration error: {e}")
        return False

def test_service_method_signature():
    """Test the service method has correct signature"""
    try:
        from services.application_service import ApplicationService
        import inspect
        
        app_service = ApplicationService()
        method = getattr(app_service, 'create_application')
        
        # Get method signature
        sig = inspect.signature(method)
        params = list(sig.parameters.keys())
        
        # Should have user_id and application_data parameters
        if 'user_id' in params and 'application_data' in params:
            print("✓ Service method has correct signature")
            return True
        else:
            print(f"✗ Incorrect method signature. Parameters: {params}")
            return False
        
    except Exception as e:
        print(f"✗ Service method signature error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing TRAVAIA POST /api/applications Implementation...")
    print("=" * 60)
    
    tests = [
        ("Import Tests", test_imports),
        ("Request Model Tests", test_request_models),
        ("Endpoint Registration Tests", test_endpoint_registration),
        ("Service Method Signature Tests", test_service_method_signature)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        if test_func():
            passed += 1
        else:
            print(f"Failed: {test_name}")
    
    print("\n" + "=" * 60)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! POST /api/applications endpoint is ready.")
        print("\nEndpoint Details:")
        print("- URL: POST /api/applications")
        print("- Authentication: Required (JWT Bearer token)")
        print("- Request Body: ApplicationCreateRequest JSON")
        print("- Rate Limit: 30 requests/minute")
        print("- Response: ApiResponse with created Application data")
        print("\nSample Request Body:")
        print("""{
  "job_title": "Software Engineer",
  "company_name": "Tech Corp",
  "job_description": "Exciting role in software development",
  "link_to_job_post": "https://company.com/jobs/123",
  "status": "applied",
  "contacts": [
    {
      "name": "John Doe",
      "role": "Hiring Manager",
      "email": "john@company.com"
    }
  ],
  "notes": [
    {
      "content": "Great company culture"
    }
  ]
}""")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
