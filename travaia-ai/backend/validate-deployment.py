#!/usr/bin/env python3
"""
TRAVAIA Deployment Validation Script
Validates deployment configuration and service readiness
"""

import os
import json
import subprocess
import sys
from pathlib import Path

def check_service_structure():
    """Check if all service directories exist with required files"""
    print("🔍 Validating service structure...")
    
    services = [
        "ai-engine-service",
        "application-job-service", 
        "document-report-service",
        "analytics-growth-service",
        "user-auth-service",
        "interview-session-service",
        "voice-processing-service",
        "careergpt-coach-service",
        "shared",
        "api-gateway",
        "webrtc-media-server"
    ]
    
    backend_path = Path(__file__).parent
    missing_services = []
    
    for service in services:
        service_path = backend_path / service
        if not service_path.exists():
            missing_services.append(service)
            print(f"❌ Missing service directory: {service}")
        else:
            # Check for main.py or app.py
            has_main = (service_path / "main.py").exists() or (service_path / "app.py").exists()
            has_requirements = (service_path / "requirements.txt").exists()
            
            if service != "webrtc-media-server":  # WebRTC uses Docker image
                if not has_main:
                    print(f"⚠️  {service}: Missing main.py/app.py")
                if not has_requirements:
                    print(f"⚠️  {service}: Missing requirements.txt")
                
                if has_main and has_requirements:
                    print(f"✅ {service}: Structure valid")
            else:
                print(f"✅ {service}: Directory exists (Docker image service)")
    
    return len(missing_services) == 0

def check_environment_config():
    """Check environment configuration"""
    print("\n🔍 Validating environment configuration...")
    
    env_file = Path(__file__).parent / ".env"
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    
    required_vars = [
        "GEMINI_API_KEY",
        "VITE_AUTH_SERVICE_URL",
        "VITE_INTERVIEW_BOT_SERVICE_URL",
        "VITE_BACKEND_URL"
    ]
    
    env_content = env_file.read_text()
    missing_vars = []
    
    for var in required_vars:
        if var not in env_content:
            missing_vars.append(var)
            print(f"❌ Missing environment variable: {var}")
        else:
            print(f"✅ Found environment variable: {var}")
    
    return len(missing_vars) == 0

def check_deployment_scripts():
    """Check deployment scripts exist and are valid"""
    print("\n🔍 Validating deployment scripts...")
    
    backend_path = Path(__file__).parent
    scripts = [
        "deploy-all-services.bat",
        "deploy-all-services.sh"
    ]
    
    all_exist = True
    for script in scripts:
        script_path = backend_path / script
        if script_path.exists():
            print(f"✅ Found deployment script: {script}")
            
            # Check if script contains all services
            content = script_path.read_text()
            services_in_script = [
                "travaia-ai-engine-service",
                "travaia-application-job-service",
                "travaia-document-report-service",
                "travaia-analytics-growth-service",
                "travaia-user-auth-service",
                "travaia-interview-session-service",
                "travaia-voice-processing-service",
                "travaia-careergpt-coach-service",
                "travaia-shared-auth-service",
                "travaia-api-gateway"
            ]
            
            missing_in_script = []
            for service in services_in_script:
                if service not in content:
                    missing_in_script.append(service)
            
            if missing_in_script:
                print(f"⚠️  {script}: Missing services: {missing_in_script}")
            else:
                print(f"   All services included in {script}")
                
        else:
            print(f"❌ Missing deployment script: {script}")
            all_exist = False
    
    return all_exist

def check_pubsub_setup():
    """Check Pub/Sub setup files"""
    print("\n🔍 Validating Pub/Sub setup...")
    
    pubsub_path = Path(__file__).parent / "pubsub-setup"
    if not pubsub_path.exists():
        print("❌ pubsub-setup directory not found")
        return False
    
    required_files = [
        "create-topics.bat",
        "create-topics.sh"
    ]
    
    all_exist = True
    for file in required_files:
        file_path = pubsub_path / file
        if file_path.exists():
            print(f"✅ Found Pub/Sub script: {file}")
        else:
            print(f"❌ Missing Pub/Sub script: {file}")
            all_exist = False
    
    return all_exist

def check_gcloud_auth():
    """Check if gcloud is authenticated"""
    print("\n🔍 Checking Google Cloud authentication...")
    
    try:
        result = subprocess.run(
            ["gcloud", "auth", "list", "--format=json"],
            capture_output=True,
            text=True,
            check=True
        )
        
        accounts = json.loads(result.stdout)
        active_accounts = [acc for acc in accounts if acc.get("status") == "ACTIVE"]
        
        if active_accounts:
            print(f"✅ Google Cloud authenticated")
            for acc in active_accounts:
                print(f"   Active account: {acc.get('account')}")
            return True
        else:
            print("❌ No active Google Cloud authentication")
            return False
            
    except subprocess.CalledProcessError:
        print("❌ gcloud command failed - ensure Google Cloud SDK is installed")
        return False
    except FileNotFoundError:
        print("❌ gcloud command not found - install Google Cloud SDK")
        return False

def check_project_config():
    """Check Google Cloud project configuration"""
    print("\n🔍 Checking Google Cloud project configuration...")
    
    try:
        result = subprocess.run(
            ["gcloud", "config", "get-value", "project"],
            capture_output=True,
            text=True,
            check=True
        )
        
        project = result.stdout.strip()
        if project and project != "(unset)":
            print(f"✅ Google Cloud project set: {project}")
            return True
        else:
            print("❌ Google Cloud project not set")
            print("   Run: gcloud config set project travaia-e1310")
            return False
            
    except subprocess.CalledProcessError:
        print("❌ Failed to get Google Cloud project")
        return False

def main():
    """Run all validation checks"""
    print("🚀 TRAVAIA Deployment Validation")
    print("=" * 50)
    
    checks = [
        ("Service Structure", check_service_structure),
        ("Environment Config", check_environment_config),
        ("Deployment Scripts", check_deployment_scripts),
        ("Pub/Sub Setup", check_pubsub_setup),
        ("Google Cloud Auth", check_gcloud_auth),
        ("Project Config", check_project_config),
    ]
    
    results = []
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} failed with exception: {e}")
            results.append((check_name, False))
    
    print("\n" + "=" * 50)
    print("📊 VALIDATION SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {check_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} checks passed")
    
    if passed == total:
        print("🎉 All validation checks passed! Ready for deployment.")
        print("\nNext steps:")
        print("1. Run: cd backend && deploy-all-services.bat")
        print("2. Monitor deployment in Google Cloud Console")
        print("3. Test services using the provided test scripts")
        return 0
    else:
        print("⚠️  Some validation checks failed. Fix issues before deployment.")
        print("\nRecommended actions:")
        if not any(result for name, result in results if "Auth" in name):
            print("- Run: gcloud auth login")
            print("- Run: gcloud config set project travaia-e1310")
        print("- Review the setup guide: VERTEX_AI_SETUP_GUIDE.md")
        print("- Fix missing files/directories")
        return 1

if __name__ == "__main__":
    sys.exit(main())
