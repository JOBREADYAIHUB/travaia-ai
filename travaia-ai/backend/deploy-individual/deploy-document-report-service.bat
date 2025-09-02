@echo off
REM TRAVAIA Document Report Service Deployment Script
REM Deploys the Document Report Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Document Report Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-document-report-service
echo.

echo 📄 Building and deploying Document Report Service...
cd ../document-report-service
gcloud builds submit --tag gcr.io/%GOOGLE_CLOUD_PROJECT%/travaia-document-report-service --region=%GOOGLE_CLOUD_REGION%
gcloud run deploy travaia-document-report-service ^
  --image=gcr.io/%GOOGLE_CLOUD_PROJECT%/travaia-document-report-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=2Gi ^
  --cpu=1 ^
  --concurrency=50 ^
  --max-instances=10 ^
  --timeout=300 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,PORT=8080" ^
  --project=%GOOGLE_CLOUD_PROJECT%
cd ../deploy-individual

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Document Report Service deployed successfully!
    echo 🌐 Service URL: https://travaia-document-report-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-document-report-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Document Report Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Document Report Service Deployment Complete
echo ========================================
