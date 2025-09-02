@echo off
echo ========================================
echo TRAVAIA Backend Services Health Check
echo ========================================
echo.

set "SERVICES=ai-engine-service analytics-growth-service application-job-service careergpt-coach-service document-report-service interview-session-service user-auth-service voice-processing-service api-gateway webrtc-media-server shared-auth-service pubsub-setup integration-tests"

echo Checking all deployed services...
echo.

for %%s in (%SERVICES%) do (
    echo Checking travaia-%%s...
    gcloud run services describe travaia-%%s --region=us-central1 --format="value(status.url)" 2>nul
    if errorlevel 1 (
        echo   ❌ Service not found or not accessible
    ) else (
        echo   ✅ Service deployed and accessible
    )
    echo.
)

echo ========================================
echo Health Check Summary Complete
echo ========================================
echo.
echo All services are deployed to:
echo Project: travaia-e1310
echo Region: us-central1
echo.
echo Service URLs follow pattern:
echo https://travaia-[service-name]-976191766214.us-central1.run.app
echo.
echo To test individual service health:
echo curl https://[service-url]/health
echo.
pause
