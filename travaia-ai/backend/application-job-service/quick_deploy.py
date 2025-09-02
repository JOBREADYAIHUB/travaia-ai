#!/usr/bin/env python3
"""
Quick deployment script to fix host header issue
"""

import subprocess
import sys
import time

def run_command(cmd):
    """Run command and return success status"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        print(f"Command: {cmd}")
        print(f"Return code: {result.returncode}")
        if result.stdout:
            print(f"Output: {result.stdout}")
        if result.stderr:
            print(f"Error: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"Exception: {e}")
        return False

def main():
    print("🚀 Quick redeployment to fix host header issue...")
    
    # Deploy command
    cmd = """gcloud run deploy travaia-application-job-service \
--source=. \
--platform=managed \
--region=us-central1 \
--allow-unauthenticated \
--port=8080 \
--memory=1Gi \
--cpu=1 \
--project=travaia-e1310"""
    
    success = run_command(cmd)
    
    if success:
        print("✅ Deployment successful!")
        
        # Test the service
        time.sleep(10)  # Wait for deployment
        
        service_url = "https://travaia-application-job-service-travaia-e1310.a.run.app"
        print(f"🧪 Testing service at: {service_url}")
        
        # Test health endpoint
        test_cmd = f"curl -s -o /dev/null -w '%{{http_code}}' {service_url}/health"
        print(f"Testing: {test_cmd}")
        
        return True
    else:
        print("❌ Deployment failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
