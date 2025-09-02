@echo off
REM Validate Google Secret Manager Configuration for TRAVAIA Backend
REM This script verifies that all required secrets are properly configured

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310

echo ================================
echo TRAVAIA SECRET MANAGER VALIDATION
echo ================================
echo Project: %GOOGLE_CLOUD_PROJECT%
echo.

set VALIDATION_PASSED=true
set REQUIRED_SECRETS=gemini-api-key livekit-url livekit-api-key livekit-api-secret firebase-service-account jwt-secret

echo Checking required secrets...
echo.

for %%s in (%REQUIRED_SECRETS%) do (
    echo Checking %%s...
    gcloud secrets describe %%s --project=%GOOGLE_CLOUD_PROJECT% >nul 2>&1
    if !errorlevel! equ 0 (
        echo   ✅ %%s exists
        
        REM Check if secret has versions
        for /f %%v in ('gcloud secrets versions list %%s --project=%GOOGLE_CLOUD_PROJECT% --limit=1 --format="value(name)" 2^>nul') do (
            if "%%v"=="" (
                echo   ❌ %%s has no versions - needs value
                set VALIDATION_PASSED=false
            ) else (
                echo   ✅ %%s has version: %%v
            )
        )
    ) else (
        echo   ❌ %%s does not exist
        set VALIDATION_PASSED=false
    )
    echo.
)

echo Checking service account permissions...
set SERVICE_ACCOUNT=travaia-backend-services@%GOOGLE_CLOUD_PROJECT%.iam.gserviceaccount.com

REM Check if service account exists
gcloud iam service-accounts describe %SERVICE_ACCOUNT% --project=%GOOGLE_CLOUD_PROJECT% >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Service account exists: %SERVICE_ACCOUNT%
) else (
    echo ❌ Service account does not exist: %SERVICE_ACCOUNT%
    set VALIDATION_PASSED=false
)

echo.
echo Checking secret access permissions...
for %%s in (%REQUIRED_SECRETS%) do (
    gcloud secrets get-iam-policy %%s --project=%GOOGLE_CLOUD_PROJECT% --format="value(bindings.members)" 2>nul | findstr /C:"serviceAccount:%SERVICE_ACCOUNT%" >nul
    if !errorlevel! equ 0 (
        echo ✅ %%s: Service account has access
    ) else (
        echo ❌ %%s: Service account missing access
        set VALIDATION_PASSED=false
    )
)

echo.
echo Checking Google Cloud APIs...
set REQUIRED_APIS=secretmanager.googleapis.com run.googleapis.com firestore.googleapis.com pubsub.googleapis.com

for %%a in (%REQUIRED_APIS%) do (
    gcloud services list --enabled --filter="name:%%a" --format="value(name)" --project=%GOOGLE_CLOUD_PROJECT% | findstr "%%a" >nul
    if !errorlevel! equ 0 (
        echo ✅ %%a enabled
    ) else (
        echo ❌ %%a not enabled
        set VALIDATION_PASSED=false
    )
)

echo.
echo ================================
if "%VALIDATION_PASSED%"=="true" (
    echo ✅ VALIDATION PASSED!
    echo ================================
    echo.
    echo All secrets and permissions are properly configured.
    echo You can now run deploy-all-services-secure.bat
    echo.
    echo Next steps:
    echo 1. Deploy services: deploy-all-services-secure.bat
    echo 2. Test health endpoints after deployment
    echo 3. Monitor service logs for any issues
) else (
    echo ❌ VALIDATION FAILED!
    echo ================================
    echo.
    echo Some secrets or permissions are missing.
    echo Please fix the issues above before deploying.
    echo.
    echo Common fixes:
    echo 1. Run setup-secrets-manager.bat if secrets don't exist
    echo 2. Add secret values using gcloud commands
    echo 3. Check service account permissions
    echo 4. Enable required Google Cloud APIs
)

echo.
echo For detailed setup instructions, see PRODUCTION_SECRETS_GUIDE.md
echo.
pause
