# TRAVAIA User & Authentication Service - Deployment Guide

## Overview

The TRAVAIA User & Authentication Service is a FastAPI-based microservice that handles user profiles, authentication, and gamification features. It serves as the central source of truth for user data in the TRAVAIA ecosystem.

## Features

- **User Authentication**: Registration, login, logout, token management
- **Profile Management**: User profiles, settings, preferences
- **Gamification System**: XP, levels, achievements, streaks
- **Multilingual Support**: User language preferences
- **Firebase Integration**: Authentication and Firestore database
- **Cloud Run Ready**: Containerized and scalable

## Prerequisites

- Google Cloud Platform account
- Firebase project with Authentication and Firestore enabled
- Docker installed (for local development)
- gcloud CLI installed and configured

## Local Development

### 1. Environment Setup

```bash
# Clone the repository
cd backend/user-auth-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 2. Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication and Firestore
3. Download service account key JSON file
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

### 3. Run Locally

```bash
# Start the service
python main.py

# Test the service
python quick_test.py
```

The service will be available at `http://localhost:8080`

## Cloud Deployment

### 1. Automatic Deployment (Recommended)

```bash
# Set your GCP project ID
export PROJECT_ID="your-gcp-project-id"

# Deploy using the script
chmod +x deploy.sh
./deploy.sh

# Or on Windows
.\deploy.ps1 -ProjectId "your-gcp-project-id"
```

### 2. Manual Deployment

```bash
# Build and push image
gcloud builds submit --config cloudbuild.yaml

# Deploy to Cloud Run
gcloud run deploy travaia-user-auth-service \
  --image gcr.io/$PROJECT_ID/travaia-user-auth-service:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | `travaia-prod` |
| `FIREBASE_API_KEY` | Firebase web API key | `AIza...` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | `/path/to/key.json` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `ENVIRONMENT` | `development` | Environment name |
| `LOG_LEVEL` | `INFO` | Logging level |
| `ALLOWED_ORIGINS` | `*` | CORS origins |

## API Endpoints

### Authentication (`/auth`)

- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/verify-email` - Send email verification
- `POST /auth/reset-password` - Send password reset

### Profile Management (`/profile`)

- `GET /profile/` - Get user profile
- `PUT /profile/` - Update user profile
- `GET /profile/settings` - Get user settings
- `PUT /profile/settings` - Update user settings
- `DELETE /profile/` - Delete user account
- `GET /profile/completion` - Get profile completion status
- `POST /profile/language` - Update preferred language

### Gamification (`/gamification`)

- `GET /gamification/stats` - Get gamification statistics
- `GET /gamification/level` - Get user level info
- `GET /gamification/achievements` - Get user achievements
- `GET /gamification/streaks` - Get user streaks
- `POST /gamification/activity` - Record user activity
- `GET /gamification/leaderboard` - Get leaderboard
- `GET /gamification/daily-challenge` - Get daily challenge

## Testing

### Quick Test

```bash
# Test local service
python quick_test.py

# Test deployed service
python quick_test.py --url https://your-service-url
```

### Manual Testing

```bash
# Health check
curl https://your-service-url/health

# API documentation
open https://your-service-url/docs
```

## Security Configuration

### Firebase Security Rules

The service requires proper Firestore security rules. Example rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // User sub-collections
      match /{collection}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### CORS Configuration

Configure CORS origins in the environment variables:

```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Monitoring and Logging

### Health Checks

- **Endpoint**: `/health`
- **Expected Response**: `{"status": "healthy"}`
- **Frequency**: Every 30 seconds

### Logging

The service uses structured logging with the following levels:
- `ERROR`: Critical errors
- `WARNING`: Important warnings
- `INFO`: General information
- `DEBUG`: Detailed debugging (development only)

### Metrics

Key metrics to monitor:
- Response time
- Error rate
- Authentication success rate
- User registration rate
- Active user sessions

## Scaling Configuration

### Cloud Run Settings

- **Memory**: 1Gi (recommended)
- **CPU**: 1 vCPU (recommended)
- **Min Instances**: 0 (cost optimization)
- **Max Instances**: 10 (adjust based on load)
- **Concurrency**: 100 requests per instance

### Performance Tuning

1. **Database Optimization**:
   - Use Firestore indexes for queries
   - Implement caching for frequently accessed data
   - Batch operations when possible

2. **Authentication Optimization**:
   - Cache Firebase tokens
   - Use connection pooling
   - Implement rate limiting

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Check Firebase configuration
   - Verify service account permissions
   - Ensure API keys are correct

2. **Database Connection Issues**:
   - Verify Firestore is enabled
   - Check security rules
   - Ensure proper credentials

3. **CORS Errors**:
   - Update `ALLOWED_ORIGINS` environment variable
   - Check frontend domain configuration

### Debug Commands

```bash
# Check service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=travaia-user-auth-service" --limit 50

# Check service status
gcloud run services describe travaia-user-auth-service --region=us-central1

# Test endpoints
curl -X GET "https://your-service-url/status"
```

## Integration with Other Services

### Frontend Integration

```javascript
// Example frontend integration
const API_BASE = 'https://your-service-url';

// Register user
const registerUser = async (userData) => {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Get user profile
const getUserProfile = async (token) => {
  const response = await fetch(`${API_BASE}/profile/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### Microservice Communication

The service can communicate with other TRAVAIA microservices:

```python
# Example: Notify other services of user events
import requests

async def notify_user_registered(user_id: str):
    await requests.post(
        "https://analytics-service-url/events",
        json={"event": "user_registered", "user_id": user_id}
    )
```

## Support

For issues and questions:
1. Check the logs using `gcloud logging`
2. Review the API documentation at `/docs`
3. Run the quick test script
4. Check Firebase console for authentication issues

## Version History

- **v1.0.0**: Initial release with core authentication and profile features
- **v1.1.0**: Added gamification system
- **v1.2.0**: Enhanced security and performance optimizations
