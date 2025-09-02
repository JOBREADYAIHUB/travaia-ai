@echo off
REM Production Credentials Setup for TRAVAIA Backend Services
REM Run this script to configure Google Cloud credentials for Cloud Run deployment

echo Setting up production credentials for TRAVAIA backend services...
echo.

REM Check if gcloud is installed
gcloud version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Google Cloud CLI not found. Please install gcloud first.
    echo Download from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Set project variables
set PROJECT_ID=travaia-e1310
set REGION=us-central1
set SERVICE_ACCOUNT_NAME=travaia-backend-services

echo Project ID: %PROJECT_ID%
echo Region: %REGION%
echo Service Account: %SERVICE_ACCOUNT_NAME%
echo.

REM Set the project
echo Setting project to %PROJECT_ID%...
gcloud config set project %PROJECT_ID%

REM Enable required APIs
echo Enabling required Google Cloud APIs...
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable firebase.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable speech.googleapis.com
gcloud services enable texttospeech.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable bigquery.googleapis.com

REM Create service account for backend services
echo Creating service account: %SERVICE_ACCOUNT_NAME%...
gcloud iam service-accounts create %SERVICE_ACCOUNT_NAME% ^
    --display-name="TRAVAIA Backend Services" ^
    --description="Service account for TRAVAIA backend microservices"

REM Grant necessary IAM roles
echo Granting IAM roles to service account...
gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/firebase.admin"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/speech.client"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/pubsub.admin"

gcloud projects add-iam-policy-binding %PROJECT_ID% ^
    --member="serviceAccount:%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com" ^
    --role="roles/bigquery.dataEditor"

REM Create and download service account key
echo Creating service account key...
gcloud iam service-accounts keys create travaia-backend-key.json ^
    --iam-account=%SERVICE_ACCOUNT_NAME%@%PROJECT_ID%.iam.gserviceaccount.com

echo.
echo ================================
echo PRODUCTION SETUP COMPLETE!
echo ================================
echo.
echo Service account key saved to: travaia-backend-key.json
echo.
echo NEXT STEPS:
echo 1. Store the service account key securely
echo 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable in Cloud Run
echo 3. Deploy services using deploy-all-services.bat
echo.
echo For Cloud Run deployment, the services will use Application Default Credentials
echo which are automatically available in the Cloud Run environment.
echo.
pause
