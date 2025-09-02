#!/bin/bash

# TRAVAIA User & Authentication Service Deployment Script
# Deploys the service to Google Cloud Run

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
SERVICE_NAME="travaia-user-auth-service"
REGION=${REGION:-"us-central1"}
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🚀 Deploying TRAVAIA User & Authentication Service..."
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy using Cloud Build
echo "🏗️ Building and deploying with Cloud Build..."
gcloud builds submit --config cloudbuild.yaml --substitutions=_SERVICE_NAME=$SERVICE_NAME

# Get the service URL
echo "🌐 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment completed successfully!"
echo "🔗 Service URL: $SERVICE_URL"
echo "📊 Health Check: $SERVICE_URL/health"
echo "📖 API Documentation: $SERVICE_URL/docs"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -f "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed - service may still be starting up"
fi

echo "🎉 TRAVAIA User & Authentication Service deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in Cloud Run console"
echo "2. Set up Firebase service account credentials"
echo "3. Configure CORS origins for your frontend"
echo "4. Test authentication endpoints"
