@echo off
REM TRAVAIA Resume Deconstruction Service Deployment Script
REM Deploys the Resume Deconstruction Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Resume Deconstruction Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-resume-deconstruction-service
echo.

echo 🔍 Deploying Resume Deconstruction Service...
gcloud run deploy travaia-resume-deconstruction-service ^
  --source=../resume-deconstruction-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=4Gi ^
  --cpu=2 ^
  --concurrency=25 ^
  --max-instances=50 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GEMINI_API_KEY=AIzaSyB5nIC_Kes1GVyBa5ycIddLaYLb3veObsE,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Resume Deconstruction Service deployed successfully!
    echo 🌐 Service URL: https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Resume Deconstruction Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Resume Deconstruction Service Deployment Complete
echo ========================================
