#!/usr/bin/env python3
"""
TRAVAIA Application Job Service - Cloud Run Deployment Script
"""

import subprocess
import sys
import os
import json
import time

def run_command(cmd, cwd=None):
    """Run shell command and return result"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True, 
            cwd=cwd
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def deploy_to_cloud_run():
    """Deploy the service to Google Cloud Run"""
    
    project_id = "travaia-e1310"
    service_name = "travaia-application-job-service"
    region = "us-central1"
    
    print("🚀 Deploying TRAVAIA Application Job Service to Cloud Run...")
    print(f"Project: {project_id}")
    print(f"Service: {service_name}")
    print(f"Region: {region}")
    print()
    
    # Build and deploy command
    deploy_cmd = f"""
    gcloud run deploy {service_name} \
      --source=. \
      --platform=managed \
      --region={region} \
      --allow-unauthenticated \
      --port=8080 \
      --memory=1Gi \
      --cpu=1 \
      --concurrency=100 \
      --max-instances=10 \
      --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT={project_id}" \
      --project={project_id}
    """.strip().replace('\n', ' ').replace('\\', '')
    
    print("Executing deployment command...")
    success, stdout, stderr = run_command(deploy_cmd)
    
    if success:
        print("✅ Deployment successful!")
        service_url = f"https://{service_name}-{project_id}.a.run.app"
        print(f"🌐 Service URL: {service_url}")
        
        # Test health endpoint
        print("\n🔍 Testing service health...")
        time.sleep(5)  # Wait for service to be ready
        
        health_cmd = f"curl -f {service_url}/health"
        health_success, health_out, health_err = run_command(health_cmd)
        
        if health_success:
            print("✅ Health check passed!")
            print(f"Response: {health_out}")
        else:
            print("⚠️ Health check failed, but service may still be starting...")
            print(f"Error: {health_err}")
        
        return True, service_url
    else:
        print("❌ Deployment failed!")
        print(f"Error: {stderr}")
        return False, None

def test_endpoints(service_url):
    """Test the deployed endpoints"""
    print(f"\n🧪 Testing endpoints at {service_url}")
    
    # Test root endpoint
    print("Testing root endpoint...")
    success, out, err = run_command(f"curl -s {service_url}/")
    if success:
        print("✅ Root endpoint working")
    else:
        print(f"❌ Root endpoint failed: {err}")
    
    # Test health endpoint
    print("Testing health endpoint...")
    success, out, err = run_command(f"curl -s {service_url}/health")
    if success:
        print("✅ Health endpoint working")
        print(f"Response: {out}")
    else:
        print(f"❌ Health endpoint failed: {err}")
    
    print(f"\n📋 Manual testing instructions:")
    print(f"GET /api/applications: curl -H 'Authorization: Bearer <JWT>' {service_url}/api/applications")
    print(f"POST /api/applications: curl -X POST -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' -d '{{\"job_title\":\"Test\",\"company_name\":\"Test Corp\"}}' {service_url}/api/applications")

if __name__ == "__main__":
    print("TRAVAIA Application Job Service Deployment")
    print("="*50)
    
    # Check if gcloud is available
    success, _, _ = run_command("gcloud version")
    if not success:
        print("❌ gcloud CLI not found. Please install Google Cloud SDK.")
        sys.exit(1)
    
    # Deploy the service
    deploy_success, service_url = deploy_to_cloud_run()
    
    if deploy_success and service_url:
        test_endpoints(service_url)
        print(f"\n🎉 Deployment complete! Service available at: {service_url}")
    else:
        print("❌ Deployment failed!")
        sys.exit(1)
