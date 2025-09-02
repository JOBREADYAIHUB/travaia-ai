@echo off
REM TRAVAIA Cloud Pub/Sub Topics Setup for Windows
REM Creates all necessary topics and subscriptions for microservices communication

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310

echo Setting up Cloud Pub/Sub for TRAVAIA microservices...
echo Project ID: %GOOGLE_CLOUD_PROJECT%

REM Create topics
echo Creating Pub/Sub topics...

REM Test gcloud authentication first
echo Testing gcloud authentication...
gcloud auth list --filter=status:ACTIVE --format="value(account)" > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Not authenticated with gcloud. Please run: gcloud auth login
    exit /b 1
)

REM Test project access
echo Testing project access...
gcloud projects describe %GOOGLE_CLOUD_PROJECT% > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Cannot access project %GOOGLE_CLOUD_PROJECT%. Check project ID and permissions.
    exit /b 1
)

REM Enable Pub/Sub API if needed
echo Ensuring Pub/Sub API is enabled...
gcloud services enable pubsub.googleapis.com --project=%GOOGLE_CLOUD_PROJECT% 2>nul

REM Create topics with explicit error handling
echo Creating topics...
call :create_topic application-events
call :create_topic ai-analysis-requests
call :create_topic interview-events
call :create_topic user-events
call :create_topic auth-events
call :create_topic document-events
call :create_topic analytics-events
call :create_topic voice-events
call :create_topic careergpt-events
call :create_topic gateway-events
call :create_topic media-events
call :create_topic test-events
call :create_topic middleware-events

echo Topics creation completed

REM Create subscriptions with explicit error handling
echo Creating Pub/Sub subscriptions...
call :create_subscription ai-analysis-requests-sub ai-analysis-requests
call :create_subscription application-events-sub application-events
call :create_subscription interview-events-sub interview-events
call :create_subscription analytics-events-sub analytics-events
call :create_subscription user-events-sub user-events
call :create_subscription auth-events-sub auth-events
call :create_subscription document-events-sub document-events
call :create_subscription voice-events-sub voice-events
call :create_subscription careergpt-events-sub careergpt-events
call :create_subscription gateway-events-sub gateway-events
call :create_subscription media-events-sub media-events
call :create_subscription test-events-sub test-events
call :create_subscription middleware-events-sub middleware-events

echo Subscriptions creation completed
goto :end_functions

REM Function to create topic with error handling
:create_topic
gcloud pubsub topics create %1 --project=%GOOGLE_CLOUD_PROJECT% 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Created topic: %1
) else (
    echo ✓ Topic %1 already exists or accessible
)
goto :eof

REM Function to create subscription with error handling  
:create_subscription
gcloud pubsub subscriptions create %1 --topic=%2 --project=%GOOGLE_CLOUD_PROJECT% 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✓ Created subscription: %1
) else (
    echo ✓ Subscription %1 already exists or accessible
)
goto :eof

:end_functions

echo ✅ Cloud Pub/Sub setup completed successfully!
echo.
echo Created Topics:
echo - application-events
echo - ai-analysis-requests
echo - interview-events
echo - user-events
echo - auth-events
echo - document-events
echo - analytics-events
echo - voice-events
echo - careergpt-events
echo - gateway-events
echo - media-events
echo - test-events
echo - middleware-events
echo.
echo Created Subscriptions:
echo - ai-analysis-requests-sub
echo - application-events-sub
echo - interview-events-sub
echo - analytics-events-sub
echo - user-events-sub
echo - auth-events-sub
echo - document-events-sub
echo - voice-events-sub
echo - careergpt-events-sub
echo - gateway-events-sub
echo - media-events-sub
echo - test-events-sub
echo - middleware-events-sub