@echo off
REM TRAVAIA Analytics Growth Service Deployment Script
REM Deploys the Analytics Growth Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Analytics Growth Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-analytics-growth-service
echo.

echo 📊 Deploying Analytics Growth Service...
gcloud run deploy travaia-analytics-growth-service ^
  --source=../analytics-growth-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=1Gi ^
  --cpu=1 ^
  --concurrency=100 ^
  --max-instances=10 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Analytics Growth Service deployed successfully!
    echo 🌐 Service URL: https://travaia-analytics-growth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-analytics-growth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Analytics Growth Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Analytics Growth Service Deployment Complete
echo ========================================
