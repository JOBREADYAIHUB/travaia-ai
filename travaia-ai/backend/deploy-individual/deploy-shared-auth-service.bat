@echo off
REM TRAVAIA Shared Auth Service Deployment Script
REM Deploys the Shared Auth Middleware Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Shared Auth Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-shared-auth-service
echo.

echo 🔒 Deploying Shared Auth Service...
gcloud run deploy travaia-shared-auth-service ^
  --source=../shared ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=512Mi ^
  --cpu=1 ^
  --concurrency=100 ^
  --max-instances=5 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Shared Auth Service deployed successfully!
    echo 🌐 Service URL: https://travaia-shared-auth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-shared-auth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Shared Auth Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Shared Auth Service Deployment Complete
echo ========================================
