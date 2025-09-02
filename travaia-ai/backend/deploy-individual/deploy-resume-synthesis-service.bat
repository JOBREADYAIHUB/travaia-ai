@echo off
REM TRAVAIA Resume Synthesis Service Deployment Script
REM Deploys the Resume Synthesis Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Resume Synthesis Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-resume-synthesis-service
echo.

echo 📝 Deploying Resume Synthesis Service...
gcloud run deploy travaia-resume-synthesis-service ^
  --source=../resume-synthesis-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=4Gi ^
  --cpu=2 ^
  --concurrency=25 ^
  --max-instances=50 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,FIREBASE_STORAGE_BUCKET=%GOOGLE_CLOUD_PROJECT%.appspot.com,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Resume Synthesis Service deployed successfully!
    echo 🌐 Service URL: https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Resume Synthesis Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Resume Synthesis Service Deployment Complete
echo ========================================
