"""
Test script to validate the new user profile, progress, and settings update endpoints
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
            UserProfileUpdate, UserProgressUpdate, UserSettingsUpdate,
            ApiResponse, UserProfileResponse, UserProgressResponse, UserSettingsResponse
        )
        print("✓ Models imported successfully")
        
        # Test service imports
        from services.user_service import UserService
        print("✓ UserService imported successfully")
        
        # Test that UserService has the new methods
        user_service = UserService()
        assert hasattr(user_service, 'update_user_profile_data'), "Missing update_user_profile_data method"
        assert hasattr(user_service, 'update_user_progress'), "Missing update_user_progress method"
        assert hasattr(user_service, 'update_user_settings_data'), "Missing update_user_settings_data method"
        print("✓ UserService has all required methods")
        
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
        from models import UserProfileUpdate, UserProgressUpdate, UserSettingsUpdate
        
        # Test UserProfileUpdate
        profile_update = UserProfileUpdate(
            first_name="John",
            last_name="Doe",
            bio="Software Engineer"
        )
        assert profile_update.first_name == "John"
        print("✓ UserProfileUpdate model works")
        
        # Test UserProgressUpdate
        progress_update = UserProgressUpdate(
            xp=1500,
            level=5,
            current_streak=10
        )
        assert progress_update.xp == 1500
        print("✓ UserProgressUpdate model works")
        
        # Test UserSettingsUpdate
        from models import NotificationSettings, PrivacySettings, PreferenceSettings
        settings_update = UserSettingsUpdate(
            notifications=NotificationSettings(email=True, push=False),
            privacy=PrivacySettings(profile_visibility="public"),
            preferences=PreferenceSettings(theme="dark", language="en")
        )
        assert settings_update.preferences.theme == "dark"
        print("✓ UserSettingsUpdate model works")
        
        return True
        
    except Exception as e:
        print(f"✗ Pydantic model error: {e}")
        return False

def test_endpoint_structure():
    """Test that the main app structure is correct"""
    try:
        # This will test the basic structure without actually running the server
        import inspect
        
        # Import main to check if endpoints are defined
        import main
        
        # Check if the app has the required endpoints
        app = main.app
        routes = [route.path for route in app.routes]
        
        required_endpoints = ["/api/users/profile", "/api/users/progress", "/api/users/settings"]
        for endpoint in required_endpoints:
            if endpoint in routes:
                print(f"✓ Endpoint {endpoint} is registered")
            else:
                print(f"✗ Endpoint {endpoint} is missing")
                return False
        
        return True
        
    except Exception as e:
        print(f"✗ Endpoint structure error: {e}")
        return False

def main():
    """Run all tests"""
    print("Testing TRAVAIA User Auth Service Implementation...")
    print("=" * 50)
    
    tests = [
        ("Import Tests", test_imports),
        ("Pydantic Model Tests", test_pydantic_models),
        ("Endpoint Structure Tests", test_endpoint_structure)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        if test_func():
            passed += 1
        else:
            print(f"Failed: {test_name}")
    
    print("\n" + "=" * 50)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed! Implementation is ready.")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
