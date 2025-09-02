@echo off
echo Deploying TRAVAIA User Auth Service...
gcloud run deploy travaia-user-auth-service --source . --platform managed --region us-central1 --allow-unauthenticated --project travaia-e1310
echo Deployment complete!
pause
