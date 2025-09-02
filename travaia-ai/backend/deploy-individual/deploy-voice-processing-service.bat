@echo off
REM TRAVAIA Voice Processing Service Deployment Script
REM Deploys the Voice Processing Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Voice Processing Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-voice-processing-service
echo.

echo 🎙️ Deploying Voice Processing Service...
gcloud run deploy travaia-voice-processing-service ^
  --source=../voice-processing-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=2Gi ^
  --cpu=2 ^
  --concurrency=50 ^
  --max-instances=10 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json,GEMINI_API_KEY=AIzaSyB5nIC_Kes1GVyBa5ycIddLaYLb3veObsE" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Voice Processing Service deployed successfully!
    echo 🌐 Service URL: https://travaia-voice-processing-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-voice-processing-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Voice Processing Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Voice Processing Service Deployment Complete
echo ========================================
