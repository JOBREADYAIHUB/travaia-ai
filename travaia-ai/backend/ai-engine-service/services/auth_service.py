"""
Service-to-Service Authentication Service

This module provides secure authentication mechanisms for service-to-service communication
within the TRAVAIA microservices ecosystem. It implements JWT-based authentication with
proper validation, revocation handling, and logging.
"""

import jwt
import time
import uuid
import os
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import structlog
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = structlog.get_logger(__name__)

# Security settings
JWT_SECRET = os.getenv("JWT_SERVICE_SECRET", "development-service-secret-do-not-use-in-production")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60  # Default 1 hour expiration

# Service registry for valid service names
VALID_SERVICES = {
    "application-job-service": {"roles": ["read", "write"]},
    "interview-session-service": {"roles": ["read", "write"]},
    "document-report-service": {"roles": ["read"]},
    "analytics-growth-service": {"roles": ["read"]},
    "user-auth-service": {"roles": ["read"]},
}

class ServiceAuthException(HTTPException):
    """Custom exception for service authentication errors"""
    def __init__(self, detail: str):
        super().__init__(status_code=401, detail=detail)

# HTTP Bearer token scheme
security = HTTPBearer()

class AuthService:
    """Service authentication manager for microservice communication"""
    
    def __init__(self):
        self._revoked_tokens: Dict[str, datetime] = {}
        self._cleanup_counter: int = 0
        logger.info("AuthService initialized")
        
    def generate_token(self, service_name: str, roles: List[str]) -> Dict[str, str]:
        """Generate a service-to-service JWT token"""
        if service_name not in VALID_SERVICES:
            raise ValueError(f"Invalid service name: {service_name}")
            
        # Validate requested roles against allowed roles
        allowed_roles = VALID_SERVICES[service_name]["roles"]
        for role in roles:
            if role not in allowed_roles:
                raise ValueError(f"Role '{role}' is not allowed for service '{service_name}'")
        
        # Current timestamp
        timestamp = int(time.time())
        
        # Token payload
        payload = {
            "iss": "ai-engine-service",          # Issuer
            "sub": service_name,                 # Subject (service name)
            "roles": roles,                      # Service roles
            "iat": timestamp,                    # Issued at
            "exp": timestamp + (TOKEN_EXPIRE_MINUTES * 60),  # Expiration time
            "jti": str(uuid.uuid4())             # JWT ID for revocation
        }
        
        # Generate JWT token
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        logger.info(
            "Service token generated",
            service=service_name,
            roles=roles,
            expires_in=f"{TOKEN_EXPIRE_MINUTES} minutes"
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": TOKEN_EXPIRE_MINUTES * 60,
            "service": service_name,
            "roles": roles
        }
        
    def verify_token(self, token: str) -> Dict:
        """Verify and decode a service JWT token"""
        try:
            # First check if token is revoked
            self._periodic_cleanup()
            
            # Decode and verify the token
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            # Check token ID against revocation list
            token_id = payload.get("jti")
            if token_id and token_id in self._revoked_tokens:
                raise ServiceAuthException("Token has been revoked")
                
            # Validate service name
            service_name = payload.get("sub")
            if not service_name or service_name not in VALID_SERVICES:
                raise ServiceAuthException("Invalid service identity")
                
            # Return the decoded payload
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired service token", error="token_expired")
            raise ServiceAuthException("Token has expired")
            
        except jwt.InvalidTokenError as e:
            logger.warning("Invalid service token", error=str(e))
            raise ServiceAuthException(f"Invalid token: {str(e)}")
            
    def revoke_token(self, token: str) -> Dict:
        """Revoke a valid service token"""
        try:
            # Decode without verification to get token ID
            payload = jwt.decode(token, options={"verify_signature": False})
            token_id = payload.get("jti")
            
            if not token_id:
                raise ServiceAuthException("Token missing ID claim (jti)")
                
            # Get expiration time
            exp_timestamp = payload.get("exp")
            if exp_timestamp:
                expiration = datetime.fromtimestamp(exp_timestamp)
            else:
                # Default to 1 hour if no expiration found
                expiration = datetime.now() + timedelta(hours=1)
                
            # Add to revoked tokens
            self._revoked_tokens[token_id] = expiration
            
            service_name = payload.get("sub", "unknown")
            logger.info("Token revoked", service=service_name, token_id=token_id)
            
            return {"status": "revoked", "token_id": token_id}
            
        except jwt.InvalidTokenError as e:
            logger.warning("Failed to revoke token", error=str(e))
            raise ServiceAuthException(f"Invalid token: {str(e)}")
            
    def _periodic_cleanup(self):
        """Periodically clean up expired revoked tokens"""
        # Only clean up every 100 verifications to reduce overhead
        self._cleanup_counter += 1
        if self._cleanup_counter % 100 == 0:
            now = datetime.now()
            expired_keys = [
                token_id for token_id, expiration in self._revoked_tokens.items()
                if expiration < now
            ]
            
            # Remove expired entries
            for token_id in expired_keys:
                del self._revoked_tokens[token_id]
                
            if expired_keys:
                logger.info("Cleaned up revoked tokens", removed_count=len(expired_keys))


# FastAPI dependency for protecting routes
async def verify_service_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    FastAPI dependency to verify service-to-service authentication.
    Returns the token payload if valid, raises HTTPException if invalid.
    """
    auth_service = request.app.state.auth_service
    
    if not auth_service:
        logger.error("AuthService not initialized")
        raise ServiceAuthException("Authentication service not available")
        
    token = credentials.credentials
    payload = auth_service.verify_token(token)
    
    # Check required role for this endpoint if specified
    required_role = getattr(request.route, "required_role", None)
    if required_role:
        token_roles = payload.get("roles", [])
        if required_role not in token_roles:
            logger.warning(
                "Service missing required role",
                service=payload.get("sub"),
                required_role=required_role,
                token_roles=token_roles
            )
            raise ServiceAuthException(f"Missing required role: {required_role}")
    
    # Add decoded token to request state for potential use in the route handler
    request.state.token_payload = payload
    
    # Log the access
    logger.info(
        "Service authentication successful",
        service=payload.get("sub"),
        roles=payload.get("roles"),
        path=request.url.path
    )
    
    return payload


def requires_role(role: str):
    """
    Decorator to specify required role for an endpoint.
    Usage: @router.get("/protected", dependencies=[Depends(verify_service_auth)])
           @requires_role("read")
           async def protected_endpoint():
               ...
    """
    def decorator(route):
        route.required_role = role
        return route
    return decorator
