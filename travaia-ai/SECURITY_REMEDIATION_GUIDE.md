# Security Remediation Guide

This document outlines security best practices, identified vulnerabilities, and remediation steps for the TRAVAIA platform.

## Table of Contents
1. [Critical Security Issues](#1-critical-security-issues)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Protection](#3-data-protection)
4. [API Security](#4-api-security)
5. [Infrastructure Security](#5-infrastructure-security)
6. [Compliance](#6-compliance)
7. [Incident Response](#7-incident-response)
8. [Secure Development](#8-secure-development)

## 1. Critical Security Issues

### 1.1 Exposed Service Account Key

**Risk**: High
**Location**: `service-account-key.json`

**Remediation**:
1. Rotate the exposed key immediately
2. Remove the file from version control
3. Add to `.gitignore`:
   ```
   # Service account keys
   *.json
   *.p12
   *.key
   ```
4. Use Workload Identity Federation instead of service account keys

### 1.2 Hardcoded Secrets

**Risk**: High
**Location**: `.cloudbuild/*.yaml`

**Remediation**:
1. Move secrets to Secret Manager:
   ```bash
   # Create secret
   echo -n "your-secret-value" | gcloud secrets create MY_SECRET --data-file=-
   
   # Grant access
   gcloud secrets add-iam-policy-binding MY_SECRET \
     --member="serviceAccount:${CLOUD_BUILD_SA}" \
     --role="roles/secretmanager.secretAccessor"
   ```

2. Reference in Cloud Build:
   ```yaml
   steps:
   - name: 'gcr.io/cloud-builders/gcloud'
     entrypoint: 'bash'
     args:
       - '-c'
       - |
         export MY_SECRET=$(gcloud secrets versions access latest --secret=MY_SECRET)
         # Use $MY_SECRET
     secretEnv: ['MY_SECRET']
   ```

## 2. Authentication & Authorization

### 2.1 JWT Token Validation

**Best Practices**:
- Validate token signature
- Check token expiration
- Verify issuer (iss) and audience (aud) claims
- Implement token refresh with rotation

**Example Implementation**:
```python
from firebase_admin import auth

def verify_firebase_token(id_token: str) -> dict:
    try:
        # Verify the ID token while checking if the token is revoked
        decoded_token = auth.verify_id_token(
            id_token,
            check_revoked=True,
            clock_skew_seconds=60  # Allow 1 min clock skew
        )
        return {"uid": decoded_token["uid"], "email": decoded_token.get("email")}
    except auth.RevokedIdTokenError:
        # Token revoked, inform the user to reauthenticate
        raise HTTPException(status_code=401, detail="Token revoked")
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError):
        # Token is invalid or expired
        raise HTTPException(status_code=401, detail="Invalid or expired token")
```

### 2.2 Role-Based Access Control (RBAC)

**Implementation**:
1. Define roles in Firebase Custom Claims:
   ```typescript
   // Set admin privilege on the user
   await admin.auth().setCustomUserClaims(uid, {
     roles: ['admin'],
     // Other custom claims
   });
   ```

2. Protect routes with role checks:
   ```python
   from fastapi import Depends, HTTPException
   from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
   
   security = HTTPBearer()
   
   async def require_role(role: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
       user = await get_current_user(credentials.credentials)
       if role not in user.get('roles', []):
           raise HTTPException(status_code=403, detail="Insufficient permissions")
       return user
   ```

## 3. Data Protection

### 3.1 Encryption

**At Rest**:
- Enable Cloud Storage and Cloud SQL encryption
- Use Customer-Managed Encryption Keys (CMEK)

**In Transit**:
- Enforce TLS 1.3
- Use HTTP Strict Transport Security (HSTS)
- Certificate pinning for mobile apps

### 3.2 PII Handling

**Redaction**:
```python
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

def redact_pii(text: str) -> str:
    analyzer = AnalyzerEngine()
    analyzer_results = analyzer.analyze(text=text, language='en')
    
    anonymizer = AnonymizerEngine()
    result = anonymizer.anonymize(
        text=text,
        analyzer_results=analyzer_results
    )
    return result.text
```

## 4. API Security

### 4.1 Rate Limiting

**Implementation with Redis**:
```python
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import redis
import os

app = FastAPI()
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379))
)

@app.middleware("http")
async def rate_limiter(request: Request, call_next):
    # Use API key or IP as identifier
    identifier = request.headers.get('X-API-Key') or request.client.host
    
    # 100 requests per minute
    rate_limit = 100
    window = 60  # seconds
    
    # Create a rate limit key
    key = f"rate_limit:{identifier}"
    
    # Get current count
    current = redis_client.get(key)
    if current and int(current) > rate_limit:
        return Response(
            content={"error": "Rate limit exceeded"},
            status_code=429,
            headers={
                "X-RateLimit-Limit": str(rate_limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(window)
            }
        )
    
    # Increment the counter
    pipe = redis_client.pipeline()
    pipe.incr(key, 1)
    pipe.expire(key, window)
    pipe.execute()
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_limit - int(current or 0) - 1)
    response.headers["X-RateLimit-Reset"] = str(window)
    
    return response
```

## 5. Infrastructure Security

### 5.1 Network Security

**Cloud Armor Rules**:
```bash
# Create a security policy
gcloud compute security-policies create TRAVAIA-SECURITY-POLICY \
    --description "Security policy for TRAVAIA"

# Add rules
gcloud compute security-policies rules create 1000 \
    --security-policy TRAVAIA-SECURITY-POLICY \
    --description "Block SQL injection" \
    --expression "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': 1})" \
    --action deny-403

# Apply to backend services
gcloud compute backend-services update BACKEND_SERVICE \
    --security-policy TRAVAIA-SECURITY-POLICY \
    --global
```

### 5.2 Container Security

**Best Practices**:
1. Use distroless containers
2. Run as non-root user
3. Enable workload identity
4. Scan for vulnerabilities:
   ```bash
   gcloud artifacts docker images scan-occurences \
     --project=$PROJECT_ID \
     --image=$REGION-docker.pkg.dev/$PROJECT_ID/REPO/IMAGE:TAG \
     --show-vulnerabilities
   ```

## 6. Compliance

### 6.1 Data Retention

**Example Policy**:
```sql
-- BigQuery table with expiration
CREATE OR REPLACE TABLE `project.dataset.user_activity`
PARTITION BY DATE(timestamp)
OPTIONS (
  partition_expiration_days=90,
  description="User activity logs with 90-day retention"
);
```

### 6.2 Audit Logging

**Cloud Audit Logs**:
- Enable Data Access audit logs
- Export to BigQuery for analysis
- Set up alerts for sensitive operations

## 7. Incident Response

### 7.1 Security Incident Playbook

1. **Containment**
   - Revoke compromised credentials
   - Isolate affected systems
   
2. **Eradication**
   - Patch vulnerabilities
   - Rotate all secrets
   
3. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   
4. **Post-Mortem**
   - Document root cause
   - Update security controls
   - Train team members

## 8. Secure Development

### 8.1 Pre-commit Hooks

**.pre-commit-config.yaml**:
```yaml
repos:
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
    -   id: detect-aws-credentials
    -   id: detect-private-key
    -   id: check-merge-conflict
    -   id: check-yaml
    -   id: end-of-file-fixer

-   repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.0.292
    hooks:
    -   id: ruff
        args: [--fix, --exit-non-zero-on-fix]

-   repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.81.0
    hooks:
    -   id: terraform_fmt
    -   id: terraform_validate
    -   id: terraform_tfsec
```

### 8.2 Dependency Scanning

**GitHub Actions Workflow**:
```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run dependency check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'TRAVAIA'
        format: 'HTML'
        failOnCVSS: 7
        
    - name: Upload report
      uses: actions/upload-artifact@v3
      with:
        name: dependency-check-report
        path: dependency-check-report.html
```

## Regular Security Tasks

| Task | Frequency | Owner |
|------|-----------|-------|
| Rotate secrets | 90 days | DevOps |
| Update dependencies | Weekly | Dev Team |
| Security training | Quarterly | All |
| Penetration testing | Bi-annually | Security Team |
| Review access logs | Weekly | Security Team |
