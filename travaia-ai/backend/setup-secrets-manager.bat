@echo off
REM Setup Google Secret Manager for TRAVAIA Backend Services
REM This script creates secrets in Google Secret Manager for secure credential management

setlocal enabledelayedexpansion

if "%GOOGLE_CLOUD_PROJECT%"=="" set GOOGLE_CLOUD_PROJECT=travaia-e1310

echo Setting up Google Secret Manager for TRAVAIA...
echo Project: %GOOGLE_CLOUD_PROJECT%
echo.

REM Enable Secret Manager API
echo Enabling Secret Manager API...
gcloud services enable secretmanager.googleapis.com --project=%GOOGLE_CLOUD_PROJECT%

REM Create secrets (values will be set manually for security)
echo Creating secret placeholders...

REM Gemini API Key
gcloud secrets create gemini-api-key --project=%GOOGLE_CLOUD_PROJECT% || echo Secret gemini-api-key already exists

REM LiveKit credentials
gcloud secrets create livekit-url --project=%GOOGLE_CLOUD_PROJECT% || echo Secret livekit-url already exists
gcloud secrets create livekit-api-key --project=%GOOGLE_CLOUD_PROJECT% || echo Secret livekit-api-key already exists
gcloud secrets create livekit-api-secret --project=%GOOGLE_CLOUD_PROJECT% || echo Secret livekit-api-secret already exists

REM Firebase service account key
gcloud secrets create firebase-service-account --project=%GOOGLE_CLOUD_PROJECT% || echo Secret firebase-service-account already exists

REM Additional production secrets
gcloud secrets create jwt-secret --project=%GOOGLE_CLOUD_PROJECT% || echo Secret jwt-secret already exists
gcloud secrets create database-url --project=%GOOGLE_CLOUD_PROJECT% || echo Secret database-url already exists
gcloud secrets create external-api-key --project=%GOOGLE_CLOUD_PROJECT% || echo Secret external-api-key already exists

echo.
echo ================================
echo SECRETS CREATED SUCCESSFULLY!
echo ================================
echo.
echo NEXT STEPS - MANUALLY SET SECRET VALUES:
echo.
echo 1. Set Gemini API Key:
echo    gcloud secrets versions add gemini-api-key --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo    (then paste your API key and press Ctrl+D)
echo.
echo 2. Set LiveKit URL:
echo    gcloud secrets versions add livekit-url --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo    (then paste: wss://travaia-h4it5r9s.livekit.cloud)
echo.
echo 3. Set LiveKit API Key:
echo    gcloud secrets versions add livekit-api-key --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo    (then paste your LiveKit API key)
echo.
echo 4. Set LiveKit API Secret:
echo    gcloud secrets versions add livekit-api-secret --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo    (then paste your LiveKit API secret)
echo.
echo 5. Set Firebase Service Account:
echo    gcloud secrets versions add firebase-service-account --data-file=service-account-key.json --project=%GOOGLE_CLOUD_PROJECT%
echo.
echo 6. Set JWT Secret Key:
echo    gcloud secrets versions add jwt-secret --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo    (then paste your JWT secret key)
echo.
echo 7. Set Database URL (if needed):
echo    gcloud secrets versions add database-url --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo.
echo 8. Set External API Key (if needed):
echo    gcloud secrets versions add external-api-key --data-file=- --project=%GOOGLE_CLOUD_PROJECT%
echo.

REM Grant access to Cloud Run service account
set SERVICE_ACCOUNT=travaia-backend-services@%GOOGLE_CLOUD_PROJECT%.iam.gserviceaccount.com

echo Granting Secret Manager access to service account...
gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding livekit-url --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding livekit-api-key --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding livekit-api-secret --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding firebase-service-account --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding jwt-secret --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding database-url --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%
gcloud secrets add-iam-policy-binding external-api-key --member="serviceAccount:%SERVICE_ACCOUNT%" --role="roles/secretmanager.secretAccessor" --project=%GOOGLE_CLOUD_PROJECT%

echo.
echo ================================
echo SECRET MANAGER SETUP COMPLETE!
echo ================================
echo.
echo IMPORTANT: Run validate-secrets.bat to verify configuration
echo Then use deploy-all-services-secure.bat for secure deployment.
echo.
echo For detailed instructions, see PRODUCTION_SECRETS_GUIDE.md
echo.
pause
