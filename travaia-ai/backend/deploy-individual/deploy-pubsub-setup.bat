@echo off
REM TRAVAIA Pub/Sub Setup Deployment Script
REM Sets up Cloud Pub/Sub topics and subscriptions for all 13 microservices

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA Pub/Sub Setup Deployment
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo.
echo Creating topics and subscriptions for:
echo - AI Engine Service (ai-analysis-requests)
echo - Analytics Growth Service (analytics-events)
echo - Application Job Service (application-events)
echo - CareerGPT Coach Service (careergpt-events)
echo - Document Report Service (document-events)
echo - Interview Session Service (interview-events)
echo - User Auth Service (auth-events, user-events)
echo - Voice Processing Service (voice-events)
echo - API Gateway (gateway-events)
echo - WebRTC Media Server (media-events)
echo - Integration Tests (test-events)
echo - Shared Auth Middleware (middleware-events)
echo.

echo 🚀 Setting up Cloud Pub/Sub topics and subscriptions...
cd ..\pubsub-setup
call create-topics.bat
set PUBSUB_EXIT_CODE=%ERRORLEVEL%
cd ..\deploy-individual

if %PUBSUB_EXIT_CODE% EQU 0 (
    echo.
    echo ✅ Pub/Sub setup completed successfully!
    echo.
    echo 📊 Validating topic creation...
    gcloud pubsub topics list --project=%GOOGLE_CLOUD_PROJECT% --filter="name:travaia OR name:application OR name:ai OR name:interview OR name:user OR name:auth OR name:document OR name:analytics OR name:voice OR name:careergpt OR name:gateway OR name:media OR name:test OR name:middleware" --format="value(name)" 2>nul
    
    echo.
    echo 📋 Validating subscription creation...
    gcloud pubsub subscriptions list --project=%GOOGLE_CLOUD_PROJECT% --filter="name:sub" --format="value(name)" 2>nul
    
) else (
    echo.
    echo ❌ Pub/Sub setup failed with error code %PUBSUB_EXIT_CODE%
    echo Check the logs above for specific errors
    exit /b %PUBSUB_EXIT_CODE%
)

echo.
echo ========================================
echo Pub/Sub Setup Complete - 13 Topics Created
echo ========================================
