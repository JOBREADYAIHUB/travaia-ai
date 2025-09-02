@echo off
REM TRAVAIA CareerGPT Coach Service Deployment Script
REM Deploys the CareerGPT Coach Service to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA CareerGPT Coach Service Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-careergpt-coach-service
echo.

echo 🧠 Deploying CareerGPT Coach Service...
gcloud run deploy travaia-careergpt-coach-service ^
  --source=../careergpt-coach-service ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=2Gi ^
  --cpu=2 ^
  --concurrency=50 ^
  --max-instances=10 ^
  --set-env-vars="ENVIRONMENT=production,LIVEKIT_URL=wss://travaia-h4it5r9s.livekit.cloud,LIVEKIT_API_KEY=API7B6srgs3uT6w,LIVEKIT_API_SECRET=OHgNuPHqS9sArg0TEITjmHDXce4NJjTeLgrO1eYoLCQA,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json,GEMINI_API_KEY=AIzaSyB5nIC_Kes1GVyBa5ycIddLaYLb3veObsE" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ CareerGPT Coach Service deployed successfully!
    echo 🌐 Service URL: https://travaia-careergpt-coach-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-careergpt-coach-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ CareerGPT Coach Service deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo CareerGPT Coach Service Deployment Complete
echo ========================================
