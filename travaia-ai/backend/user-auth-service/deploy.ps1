# TRAVAIA User & Authentication Service Deployment Script (PowerShell)
# Deploys the service to Google Cloud Run

param(
    [string]$ProjectId = $env:PROJECT_ID,
    [string]$Region = "us-central1"
)

$ErrorActionPreference = "Stop"

# Configuration
$ServiceName = "travaia-user-auth-service"
$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "🚀 Deploying TRAVAIA User & Authentication Service..." -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan

# Check if gcloud is installed
try {
    gcloud version | Out-Null
} catch {
    Write-Host "❌ Error: gcloud CLI is not installed" -ForegroundColor Red
    exit 1
}

# Check if project ID is provided
if (-not $ProjectId) {
    Write-Host "❌ Error: PROJECT_ID environment variable or -ProjectId parameter is required" -ForegroundColor Red
    exit 1
}

# Set the project
Write-Host "📋 Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build
Write-Host "🏗️ Building and deploying with Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.yaml --substitutions="_SERVICE_NAME=$ServiceName"

# Get the service URL
Write-Host "🌐 Getting service URL..." -ForegroundColor Yellow
$ServiceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🔗 Service URL: $ServiceUrl" -ForegroundColor Cyan
Write-Host "📊 Health Check: $ServiceUrl/health" -ForegroundColor Cyan
Write-Host "📖 API Documentation: $ServiceUrl/docs" -ForegroundColor Cyan

# Test the deployment
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ServiceUrl/health" -Method GET -TimeoutSec 30
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Health check returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Health check failed - service may still be starting up" -ForegroundColor Yellow
}

Write-Host "TRAVAIA User and Authentication Service deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure environment variables in Cloud Run console"
Write-Host "2. Set up Firebase service account credentials"
Write-Host "3. Configure CORS origins for your frontend"
Write-Host "4. Test authentication endpoints"
