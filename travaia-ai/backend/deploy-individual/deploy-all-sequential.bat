@echo off
REM TRAVAIA Sequential Deployment Master Script
REM Deploys all backend services one by one with validation

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310
if "%GOOGLE_CLOUD_REGION%"=="" set GOOGLE_CLOUD_REGION=us-central1

echo ========================================
echo TRAVAIA SEQUENTIAL DEPLOYMENT MASTER
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo Region: %GOOGLE_CLOUD_REGION%
echo.
echo This script will deploy all 16 backend components sequentially
echo with validation after each deployment.
echo.
pause

set DEPLOYMENT_LOG=deployment-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
echo Starting deployment at %date% %time% > %DEPLOYMENT_LOG%

echo ========================================
echo PHASE 1: Infrastructure Setup
echo ========================================

echo [1/13] Deploying Pub/Sub Setup...
call deploy-pubsub-setup.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Pub/Sub Setup >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Pub/Sub Setup
    exit /b 1
)
echo SUCCESS: Pub/Sub Setup >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo PHASE 2: Core Services
echo ========================================

echo [2/13] Deploying User Auth Service...
call deploy-user-auth-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: User Auth Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at User Auth Service
    exit /b 1
)
echo SUCCESS: User Auth Service >> %DEPLOYMENT_LOG%
echo.

echo [3/13] Deploying Shared Auth Service...
call deploy-shared-auth-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Shared Auth Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Shared Auth Service
    exit /b 1
)
echo SUCCESS: Shared Auth Service >> %DEPLOYMENT_LOG%
echo.

echo [4/13] Deploying AI Engine Service...
call deploy-ai-engine-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: AI Engine Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at AI Engine Service
    exit /b 1
)
echo SUCCESS: AI Engine Service >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo PHASE 3: Business Logic Services
echo ========================================

echo [5/13] Deploying Application Job Service...
call deploy-application-job-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Application Job Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Application Job Service
    exit /b 1
)
echo SUCCESS: Application Job Service >> %DEPLOYMENT_LOG%
echo.

echo [6/13] Deploying Document Report Service...
call deploy-document-report-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Document Report Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Document Report Service
    exit /b 1
)
echo SUCCESS: Document Report Service >> %DEPLOYMENT_LOG%
echo.

echo [7/16] Deploying Analytics Growth Service...
call deploy-analytics-growth-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Analytics Growth Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Analytics Growth Service
    exit /b 1
)
echo SUCCESS: Analytics Growth Service >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo PHASE 4: Resume Builder Services
echo ========================================

echo [8/16] Deploying Resume Intake Service...
call deploy-resume-intake-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Resume Intake Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Resume Intake Service
    exit /b 1
)
echo SUCCESS: Resume Intake Service >> %DEPLOYMENT_LOG%
echo.

echo [9/16] Deploying Resume Deconstruction Service...
call deploy-resume-deconstruction-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Resume Deconstruction Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Resume Deconstruction Service
    exit /b 1
)
echo SUCCESS: Resume Deconstruction Service >> %DEPLOYMENT_LOG%
echo.

echo [10/16] Deploying Resume Synthesis Service...
call deploy-resume-synthesis-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Resume Synthesis Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Resume Synthesis Service
    exit /b 1
)
echo SUCCESS: Resume Synthesis Service >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo PHASE 5: Interview & Voice Services
echo ========================================

echo [11/16] Deploying Interview Session Service...
call deploy-interview-session-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Interview Session Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Interview Session Service
    exit /b 1
)
echo SUCCESS: Interview Session Service >> %DEPLOYMENT_LOG%
echo.

echo [12/16] Deploying Voice Processing Service...
call deploy-voice-processing-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Voice Processing Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Voice Processing Service
    exit /b 1
)
echo SUCCESS: Voice Processing Service >> %DEPLOYMENT_LOG%
echo.

echo [13/16] Deploying CareerGPT Coach Service...
call deploy-careergpt-coach-service.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: CareerGPT Coach Service >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at CareerGPT Coach Service
    exit /b 1
)
echo SUCCESS: CareerGPT Coach Service >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo PHASE 6: Infrastructure & Gateway
echo ========================================

echo [14/16] Deploying WebRTC Media Server...
call deploy-webrtc-media-server.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: WebRTC Media Server >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at WebRTC Media Server
    exit /b 1
)
echo SUCCESS: WebRTC Media Server >> %DEPLOYMENT_LOG%
echo.

echo [15/16] Deploying API Gateway...
call deploy-api-gateway.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: API Gateway >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at API Gateway
    exit /b 1
)
echo SUCCESS: API Gateway >> %DEPLOYMENT_LOG%
echo.

echo [16/16] Deploying Integration Tests...
call deploy-integration-tests.bat
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: Integration Tests >> %DEPLOYMENT_LOG%
    echo ❌ Deployment failed at Integration Tests
    exit /b 1
)
echo SUCCESS: Integration Tests >> %DEPLOYMENT_LOG%
echo.

echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo ✅ All 16 backend components deployed successfully!
echo 📋 Deployment log saved to: %DEPLOYMENT_LOG%
echo.
echo 🌐 Service URLs:
echo   • API Gateway: https://travaia-api-gateway-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • User Auth: https://travaia-user-auth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • AI Engine: https://travaia-ai-engine-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Application Job: https://travaia-application-job-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Document Report: https://travaia-document-report-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Analytics Growth: https://travaia-analytics-growth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Interview Session: https://travaia-interview-session-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Resume Intake: https://travaia-resume-intake-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Resume Deconstruction: https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Resume Synthesis: https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Voice Processing: https://travaia-voice-processing-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • CareerGPT Coach: https://travaia-careergpt-coach-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Shared Auth: https://travaia-shared-auth-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • WebRTC Server: https://travaia-webrtc-server-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Integration Tests: https://travaia-integration-tests-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo.
echo 🎉 TRAVAIA Backend Deployment Complete!
echo Completed at %date% %time% >> %DEPLOYMENT_LOG%
