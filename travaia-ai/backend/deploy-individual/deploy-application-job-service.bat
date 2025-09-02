@echo off
REM TRAVAIA Application Job Service Deployment Script
REM Deploys the Application Job Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Application Job Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-application-job-service
echo.

echo 📋 Deploying Application Job Service...
gcloud run deploy travaia-application-job-service ^
  --source=..\application-job-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=1Gi ^
  --cpu=1 ^
  --concurrency=100 ^
  --max-instances=10 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Application Job Service deployed successfully!
    echo 🌐 Service URL: https://travaia-application-job-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-application-job-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Application Job Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Application Job Service Deployment Complete
echo ========================================
