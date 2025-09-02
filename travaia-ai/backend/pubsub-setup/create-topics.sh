#!/bin/bash

# TRAVAIA Cloud Pub/Sub Topics Setup
# Creates all necessary topics and subscriptions for microservices communication

set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-"travaia-e1310"}

echo "Setting up Cloud Pub/Sub for TRAVAIA microservices..."
echo "Project ID: $PROJECT_ID"

# Create topics
echo "Creating Pub/Sub topics..."

gcloud pubsub topics create application-events --project=$PROJECT_ID || echo "Topic application-events already exists"
gcloud pubsub topics create ai-analysis-requests --project=$PROJECT_ID || echo "Topic ai-analysis-requests already exists"
gcloud pubsub topics create interview-events --project=$PROJECT_ID || echo "Topic interview-events already exists"
gcloud pubsub topics create user-events --project=$PROJECT_ID || echo "Topic user-events already exists"
gcloud pubsub topics create document-events --project=$PROJECT_ID || echo "Topic document-events already exists"
gcloud pubsub topics create analytics-events --project=$PROJECT_ID || echo "Topic analytics-events already exists"
gcloud pubsub topics create voice-events --project=$PROJECT_ID || echo "Topic voice-events already exists"
gcloud pubsub topics create careergpt-events --project=$PROJECT_ID || echo "Topic careergpt-events already exists"
gcloud pubsub topics create auth-events --project=$PROJECT_ID || echo "Topic auth-events already exists"
gcloud pubsub topics create gateway-events --project=$PROJECT_ID || echo "Topic gateway-events already exists"
gcloud pubsub topics create media-events --project=$PROJECT_ID || echo "Topic media-events already exists"
gcloud pubsub topics create test-events --project=$PROJECT_ID || echo "Topic test-events already exists"
gcloud pubsub topics create middleware-events --project=$PROJECT_ID || echo "Topic middleware-events already exists"

# Create subscriptions
echo "Creating Pub/Sub subscriptions..."

# AI Engine Service subscriptions
gcloud pubsub subscriptions create ai-analysis-requests-sub \
  --topic=ai-analysis-requests \
  --project=$PROJECT_ID || echo "Subscription ai-analysis-requests-sub already exists"

# Application Job Service subscriptions
gcloud pubsub subscriptions create application-events-sub \
  --topic=application-events \
  --project=$PROJECT_ID || echo "Subscription application-events-sub already exists"

# Interview Session Service subscriptions
gcloud pubsub subscriptions create interview-events-sub \
  --topic=interview-events \
  --project=$PROJECT_ID || echo "Subscription interview-events-sub already exists"

# Analytics Growth Service subscriptions
gcloud pubsub subscriptions create analytics-events-sub \
  --topic=analytics-events \
  --project=$PROJECT_ID || echo "Subscription analytics-events-sub already exists"

gcloud pubsub subscriptions create user-events-sub \
  --topic=user-events \
  --project=$PROJECT_ID || echo "Subscription user-events-sub already exists"

# Document Report Service subscriptions
gcloud pubsub subscriptions create document-events-sub \
  --topic=document-events \
  --project=$PROJECT_ID || echo "Subscription document-events-sub already exists"

# Voice Processing Service subscriptions
gcloud pubsub subscriptions create voice-events-sub \
  --topic=voice-events \
  --project=$PROJECT_ID || echo "Subscription voice-events-sub already exists"

# CareerGPT Coach Service subscriptions
gcloud pubsub subscriptions create careergpt-events-sub \
  --topic=careergpt-events \
  --project=$PROJECT_ID || echo "Subscription careergpt-events-sub already exists"

# User Auth Service subscriptions
gcloud pubsub subscriptions create auth-events-sub \
  --topic=auth-events \
  --project=$PROJECT_ID || echo "Subscription auth-events-sub already exists"

# API Gateway subscriptions
gcloud pubsub subscriptions create gateway-events-sub \
  --topic=gateway-events \
  --project=$PROJECT_ID || echo "Subscription gateway-events-sub already exists"

# WebRTC Media Server subscriptions
gcloud pubsub subscriptions create media-events-sub \
  --topic=media-events \
  --project=$PROJECT_ID || echo "Subscription media-events-sub already exists"

# Integration Tests subscriptions
gcloud pubsub subscriptions create test-events-sub \
  --topic=test-events \
  --project=$PROJECT_ID || echo "Subscription test-events-sub already exists"

# Shared Auth Middleware subscriptions
gcloud pubsub subscriptions create middleware-events-sub \
  --topic=middleware-events \
  --project=$PROJECT_ID || echo "Subscription middleware-events-sub already exists"

echo "✅ Cloud Pub/Sub setup completed successfully!"
echo ""
echo "Created Topics:"
echo "- application-events"
echo "- ai-analysis-requests"
echo "- interview-events"
echo "- user-events"
echo "- document-events"
echo "- analytics-events"
echo "- voice-events"
echo "- careergpt-events"
echo "- auth-events"
echo "- gateway-events"
echo "- media-events"
echo "- test-events"
echo "- middleware-events"
echo ""
echo "Created Subscriptions:"
echo "- ai-analysis-requests-sub"
echo "- application-events-sub"
echo "- interview-events-sub"
echo "- analytics-events-sub"
echo "- user-events-sub"
echo "- document-events-sub"
echo "- voice-events-sub"
echo "- careergpt-events-sub"
echo "- auth-events-sub"
echo "- gateway-events-sub"
echo "- media-events-sub"
echo "- test-events-sub"
echo "- middleware-events-sub"