@echo off
REM TRAVAIA Resume Builder Services Validation Script
REM Validates the health and deployment status of Resume Builder microservices

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310

echo ========================================
echo TRAVAIA Resume Builder Services Validation
echo ========================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo.

set VALIDATION_LOG=resume-services-validation-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
echo Starting validation at %date% %time% > %VALIDATION_LOG%

echo 📄 Validating Resume Intake Service...
curl -f -s https://travaia-resume-intake-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
if %ERRORLEVEL% EQU 0 (
    echo ✅ Resume Intake Service - HEALTHY
    echo SUCCESS: Resume Intake Service >> %VALIDATION_LOG%
) else (
    echo ❌ Resume Intake Service - UNHEALTHY
    echo FAILED: Resume Intake Service >> %VALIDATION_LOG%
)
echo.

echo 🔍 Validating Resume Deconstruction Service...
curl -f -s https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
if %ERRORLEVEL% EQU 0 (
    echo ✅ Resume Deconstruction Service - HEALTHY
    echo SUCCESS: Resume Deconstruction Service >> %VALIDATION_LOG%
) else (
    echo ❌ Resume Deconstruction Service - UNHEALTHY
    echo FAILED: Resume Deconstruction Service >> %VALIDATION_LOG%
)
echo.

echo 📝 Validating Resume Synthesis Service...
curl -f -s https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/health
if %ERRORLEVEL% EQU 0 (
    echo ✅ Resume Synthesis Service - HEALTHY
    echo SUCCESS: Resume Synthesis Service >> %VALIDATION_LOG%
) else (
    echo ❌ Resume Synthesis Service - UNHEALTHY
    echo FAILED: Resume Synthesis Service >> %VALIDATION_LOG%
)
echo.

echo ========================================
echo Resume Builder Services Validation Complete
echo ========================================
echo.
echo 📋 Validation log saved to: %VALIDATION_LOG%
echo.
echo 🌐 Service URLs:
echo   • Resume Intake: https://travaia-resume-intake-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Resume Deconstruction: https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo   • Resume Synthesis: https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app
echo.
echo 📚 API Documentation:
echo   • Resume Intake: https://travaia-resume-intake-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/docs
echo   • Resume Deconstruction: https://travaia-resume-deconstruction-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/docs
echo   • Resume Synthesis: https://travaia-resume-synthesis-service-%GOOGLE_CLOUD_PROJECT%.a.run.app/docs
echo.
echo Completed validation at %date% %time% >> %VALIDATION_LOG%
