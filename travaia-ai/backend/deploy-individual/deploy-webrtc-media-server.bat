@echo off
REM TRAVAIA WebRTC Media Server Deployment Script
REM Deploys the WebRTC Media Server (LiveKit) to Google Cloud Run

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA WebRTC Media Server Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo Service: travaia-webrtc-server
echo.

echo 📹 Deploying WebRTC Media Server...
gcloud run deploy travaia-webrtc-server ^
  --source=../webrtc-media-server ^
  --platform=managed ^
  --region=%GOOGLE_CLOUD_REGION% ^
  --allow-unauthenticated ^
  --port=8080 ^
  --memory=2Gi ^
  --cpu=2 ^
  --min-instances=1 ^
  --max-instances=10 ^
  --set-env-vars="ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=%GOOGLE_CLOUD_PROJECT%,GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json" ^
  --project=%GOOGLE_CLOUD_PROJECT%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ WebRTC Media Server deployed successfully!
    echo 🌐 Service URL: https://travaia-webrtc-server-%GOOGLE_CLOUD_PROJECT%.a.run.app
    echo.
    echo Testing service health...
    curl -f https://travaia-webrtc-server-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
    echo.
) else (
    echo.
    echo ❌ WebRTC Media Server deployment failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================
echo WebRTC Media Server Deployment Complete
echo ========================================
