"""
Simplified auth middleware for document-report-service
"""

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """
    Simplified auth function for deployment
    In production, this should validate JWT tokens properly
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # For now, return a mock user - in production this should decode and validate the JWT
    return {
        "user_id": "test-user-123",
        "email": "test@example.com"
    }
