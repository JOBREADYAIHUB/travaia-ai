@echo off
REM TRAVAIA Interview Session Service Deployment Script
REM Deploys the Interview Session Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Interview Session Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-interview-session-service
echo.

echo 🎤 Building and deploying Interview Session Service...
cd ../interview-session-service
gcloud builds submit --tag gcr.io/%GOOGLE_CLOUD_PROJECT%/travaia-interview-session-service --region=%GOOGLE_CLOUD_REGION%
gcloud run deploy travaia-interview-session-service ^
  --image=gcr.io/%GOOGLE_CLOUD_PROJECT%/travaia-interview-session-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=2Gi ^
  --cpu=2 ^
  --concurrency=50 ^
  --max-instances=10 ^
  --timeout=300 ^
  --set-env-vars="ENVIRONMENT=production,LIVEKIT_URL=wss://travaia-h4it5r9s.livekit.cloud,LIVEKIT_API_KEY=API7B6srgs3uT6w,LIVEKIT_API_SECRET=OHgNuPHqS9sArg0TEITjmHDXce4NJjTeLgrO1eYoLCQA,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,PORT=8080" ^
  --project=%GOOGLE_CLOUD_PROJECT%
cd ../deploy-individual

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Interview Session Service deployed successfully!
    echo 🌐 Service URL: https://travaia-interview-session-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-interview-session-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ Interview Session Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo Interview Session Service Deployment Complete
echo ========================================
