#!/usr/bin/env python3
"""
TRAVAIA LiveKit Migration Test Script
Tests the complete LiveKit migration and validates all services
"""

import os
import sys
import requests
import json
from pathlib import Path
from datetime import datetime

def test_environment_variables():
    """Test LiveKit environment variables"""
    print("🔍 Testing LiveKit environment variables...")
    
    required_vars = [
        "LIVEKIT_URL",
        "LIVEKIT_API_KEY", 
        "LIVEKIT_API_SECRET"
    ]
    
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    env_content = env_file.read_text()
    missing_vars = []
    
    for var in required_vars:
        if var not in env_content:
            missing_vars.append(var)
            print(f"❌ Missing: {var}")
        else:
            # Extract value for validation
            for line in env_content.split('\n'):
                if line.startswith(f"{var}="):
                    value = line.split('=', 1)[1]
                    if var == "LIVEKIT_URL":
                        if not value.startswith("wss://"):
                            print(f"❌ {var}: Invalid WebSocket URL format")
                            return False
                        print(f"✅ {var}: {value}")
                    else:
                        print(f"✅ {var}: {'*' * 10}...{value[-4:]}")
                    break
    
    return len(missing_vars) == 0

def test_livekit_token_service():
    """Test LiveKit token generation service"""
    print("\n🔍 Testing LiveKit token service...")
    
    try:
        # Import the service
        sys.path.append(str(Path(__file__).parent / "shared"))
        from livekit_auth import LiveKitTokenService
        
        service = LiveKitTokenService()
        
        # Test token generation
        token = service.generate_interview_token("test_user", "test_interview")
        if token and len(token) > 50:
            print("✅ Interview token generation successful")
        else:
            print("❌ Interview token generation failed")
            return False
        
        # Test coaching token
        coaching_token = service.generate_coaching_token("test_user", "test_session")
        if coaching_token and len(coaching_token) > 50:
            print("✅ Coaching token generation successful")
        else:
            print("❌ Coaching token generation failed")
            return False
        
        # Test bot token
        bot_token = service.generate_bot_token("test-room", "ai-assistant")
        if bot_token and len(bot_token) > 50:
            print("✅ Bot token generation successful")
        else:
            print("❌ Bot token generation failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ LiveKit token service failed: {e}")
        return False

def test_service_dependencies():
    """Test service dependencies for LiveKit migration"""
    print("\n🔍 Testing service dependencies...")
    
    services = [
        "interview-session-service",
        "careergpt-coach-service",
        "shared"
    ]
    
    all_valid = True
    
    for service in services:
        service_path = Path(__file__).parent / service
        requirements_file = service_path / "requirements.txt"
        
        if not requirements_file.exists():
            print(f"❌ {service}: requirements.txt not found")
            all_valid = False
            continue
        
        requirements = requirements_file.read_text()
        
        # Check for LiveKit dependencies
        if "livekit==" in requirements and "livekit-server-sdk==" in requirements:
            print(f"✅ {service}: LiveKit dependencies present")
        else:
            print(f"❌ {service}: Missing LiveKit dependencies")
            all_valid = False
        
        # Check for removed Pipecat dependencies
        if "pipecat-ai==" in requirements or "daily-python==" in requirements:
            print(f"⚠️  {service}: Still contains Pipecat/Daily.co dependencies")
            all_valid = False
        else:
            print(f"✅ {service}: Pipecat/Daily.co dependencies removed")
    
    return all_valid

def test_deployment_script():
    """Test deployment script for LiveKit configuration"""
    print("\n🔍 Testing deployment script...")
    
    script_path = Path(__file__).parent / "deploy-all-services.bat"
    if not script_path.exists():
        print("❌ Deployment script not found")
        return False
    
    script_content = script_path.read_text()
    
    # Check for LiveKit environment variables
    livekit_vars = [
        "LIVEKIT_URL=wss://travaia-h4it5r9s.livekit.cloud",
        "LIVEKIT_API_KEY=API7B6srgs3uT6w",
        "LIVEKIT_API_SECRET=OHgNuPHqS9sArg0TEITjmHDXce4NJjTeLgrO1eYoLCQA"
    ]
    
    all_present = True
    for var in livekit_vars:
        if var in script_content:
            print(f"✅ Found: {var.split('=')[0]}")
        else:
            print(f"❌ Missing: {var.split('=')[0]}")
            all_present = False
    
    # Check for removed Daily.co/Pipecat variables
    legacy_vars = ["DAILY_API_KEY", "PIPECAT_ENABLED"]
    legacy_found = False
    for var in legacy_vars:
        if var in script_content:
            print(f"⚠️  Legacy variable still present: {var}")
            legacy_found = True
    
    if not legacy_found:
        print("✅ Legacy Daily.co/Pipecat variables removed")
    
    return all_present and not legacy_found

def test_livekit_connectivity():
    """Test connectivity to LiveKit cloud"""
    print("\n🔍 Testing LiveKit cloud connectivity...")
    
    try:
        # Test WebSocket endpoint accessibility
        livekit_url = "wss://travaia-h4it5r9s.livekit.cloud"
        http_url = livekit_url.replace("wss://", "https://")
        
        # Simple HTTP request to check if the endpoint is reachable
        response = requests.get(f"{http_url}/", timeout=10)
        
        if response.status_code in [200, 404, 405]:  # These are expected responses
            print(f"✅ LiveKit cloud endpoint reachable")
            return True
        else:
            print(f"⚠️  LiveKit cloud returned status {response.status_code}")
            return True  # Still consider it reachable
            
    except requests.exceptions.RequestException as e:
        print(f"❌ LiveKit cloud connectivity failed: {e}")
        return False

def test_service_routes():
    """Test that services have LiveKit routes"""
    print("\n🔍 Testing service routes...")
    
    # Check Interview Session Service routes
    livekit_route_file = Path(__file__).parent / "interview-session-service" / "api" / "routes" / "livekit.py"
    if livekit_route_file.exists():
        print("✅ Interview Session Service: LiveKit routes present")
        
        # Check for key endpoints
        route_content = livekit_route_file.read_text()
        endpoints = ["/token", "/interview/start", "/room/", "/health", "/config"]
        
        for endpoint in endpoints:
            if endpoint in route_content:
                print(f"   ✅ Endpoint: {endpoint}")
            else:
                print(f"   ❌ Missing endpoint: {endpoint}")
        
        return True
    else:
        print("❌ Interview Session Service: LiveKit routes missing")
        return False

def main():
    """Run all LiveKit migration tests"""
    print("🚀 TRAVAIA LiveKit Migration Test Suite")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("LiveKit Token Service", test_livekit_token_service),
        ("Service Dependencies", test_service_dependencies),
        ("Deployment Script", test_deployment_script),
        ("LiveKit Connectivity", test_livekit_connectivity),
        ("Service Routes", test_service_routes),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 MIGRATION TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 LiveKit migration is complete and ready!")
        print("\nNext steps:")
        print("1. Deploy services: deploy-all-services.bat")
        print("2. Update frontend to use LiveKit SDK")
        print("3. Test end-to-end interview flow")
        return 0
    else:
        print("⚠️  Some migration tests failed. Review and fix issues.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
