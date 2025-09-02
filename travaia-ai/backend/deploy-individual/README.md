# TRAVAIA Backend Individual Deployment Scripts

This directory contains individual deployment scripts for each backend service, allowing for granular control over the deployment process.

## 📋 Deployment Components (16 Total)

### Core Services (8)
1. **AI Engine Service** - `deploy-ai-engine-service.bat`
2. **Analytics Growth Service** - `deploy-analytics-growth-service.bat`
3. **Application Job Service** - `deploy-application-job-service.bat`
4. **CareerGPT Coach Service** - `deploy-careergpt-coach-service.bat`
5. **Document Report Service** - `deploy-document-report-service.bat`
6. **Interview Session Service** - `deploy-interview-session-service.bat`
7. **User Auth Service** - `deploy-user-auth-service.bat`
8. **Voice Processing Service** - `deploy-voice-processing-service.bat`

### Resume Builder Services (3)
9. **Resume Intake Service** - `deploy-resume-intake-service.bat`
10. **Resume Deconstruction Service** - `deploy-resume-deconstruction-service.bat`
11. **Resume Synthesis Service** - `deploy-resume-synthesis-service.bat`

### Infrastructure Services (3)
12. **API Gateway** - `deploy-api-gateway.bat`
13. **WebRTC Media Server** - `deploy-webrtc-media-server.bat`
14. **Shared Auth Service** - `deploy-shared-auth-service.bat`

### Setup Components (2)
15. **Pub/Sub Setup** - `deploy-pubsub-setup.bat`
16. **Integration Tests** - `deploy-integration-tests.bat`

## 🚀 Deployment Options

### Option 1: Deploy All Services Sequentially
```bash
deploy-all-sequential.bat
```
This master script deploys all 16 components in the correct order with validation after each deployment.

### Option 2: Deploy Individual Services
Run any individual script to deploy a specific service:
```bash
deploy-ai-engine-service.bat
deploy-user-auth-service.bat
# etc.
```

## 📊 Deployment Order (Recommended)

1. **Infrastructure Setup**
   - `deploy-pubsub-setup.bat`

2. **Core Services**
   - `deploy-user-auth-service.bat`
   - `deploy-shared-auth-service.bat`
   - `deploy-ai-engine-service.bat`

3. **Business Logic Services**
   - `deploy-application-job-service.bat`
   - `deploy-document-report-service.bat`
   - `deploy-analytics-growth-service.bat`

4. **Resume Builder Services**
   - `deploy-resume-intake-service.bat`
   - `deploy-resume-deconstruction-service.bat`
   - `deploy-resume-synthesis-service.bat`

5. **Interview & Voice Services**
   - `deploy-interview-session-service.bat`
   - `deploy-voice-processing-service.bat`
   - `deploy-careergpt-coach-service.bat`

6. **Infrastructure & Gateway**
   - `deploy-webrtc-media-server.bat`
   - `deploy-api-gateway.bat`
   - `deploy-integration-tests.bat`

## 🔧 Configuration

Each script uses these environment variables:
- `GOOGLE_CLOUD_PROJECT` (default: travaia-e1310)
- `GOOGLE_CLOUD_REGION` (default: us-central1)

## 📝 Features

- ✅ **Error Handling**: Each script validates deployment success
- ✅ **Health Checks**: Automatic service health validation
- ✅ **Logging**: Deployment logs with timestamps
- ✅ **Environment Variables**: Production-ready configuration
- ✅ **Resource Allocation**: Optimized memory/CPU settings
- ✅ **Security**: Non-root users, security headers
- ✅ **Monitoring**: Health check endpoints

## 🌐 Expected Service URLs

After deployment, services will be available at:
- API Gateway: `https://travaia-api-gateway-{PROJECT_ID}.a.run.app`
- User Auth: `https://travaia-user-auth-service-{PROJECT_ID}.a.run.app`
- AI Engine: `https://travaia-ai-engine-service-{PROJECT_ID}.a.run.app`
- Application Job: `https://travaia-application-job-service-{PROJECT_ID}.a.run.app`
- Document Report: `https://travaia-document-report-service-{PROJECT_ID}.a.run.app`
- Analytics Growth: `https://travaia-analytics-growth-service-{PROJECT_ID}.a.run.app`
- Resume Intake: `https://travaia-resume-intake-service-{PROJECT_ID}.a.run.app`
- Resume Deconstruction: `https://travaia-resume-deconstruction-service-{PROJECT_ID}.a.run.app`
- Resume Synthesis: `https://travaia-resume-synthesis-service-{PROJECT_ID}.a.run.app`
- Interview Session: `https://travaia-interview-session-service-{PROJECT_ID}.a.run.app`
- Voice Processing: `https://travaia-voice-processing-service-{PROJECT_ID}.a.run.app`
- CareerGPT Coach: `https://travaia-careergpt-coach-service-{PROJECT_ID}.a.run.app`
- Shared Auth: `https://travaia-shared-auth-service-{PROJECT_ID}.a.run.app`
- WebRTC Server: `https://travaia-webrtc-server-{PROJECT_ID}.a.run.app`
- Integration Tests: `https://travaia-integration-tests-{PROJECT_ID}.a.run.app`

## 🔍 Troubleshooting

1. **Authentication Issues**: Ensure `gcloud auth login` is completed
2. **Project Issues**: Verify `GOOGLE_CLOUD_PROJECT` is set correctly
3. **Permission Issues**: Ensure Cloud Run Admin role is assigned
4. **Build Issues**: Check Dockerfile and requirements.txt in each service
5. **Health Check Failures**: Review service logs in Google Cloud Console
