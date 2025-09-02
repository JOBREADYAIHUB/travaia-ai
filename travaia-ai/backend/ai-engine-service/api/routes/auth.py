"""
Authentication Routes - Service-to-service authentication management
"""

"""
Authentication Routes - Service-to-service authentication management
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Security
import structlog

from api.dependencies import get_auth_service
from services.auth_service import AuthService, verify_service_auth, requires_role
from models.dto import TokenRequest, TokenRevokeRequest
from models.domain import TokenResponse, TokenRevokeResponse, AuthHealthCheckResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/token", response_model=TokenResponse)
async def generate_token(
    request: TokenRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Generate a service-to-service authentication token"""
    try:
        token_data = auth_service.generate_token(request.service_name, request.roles)
        return token_data
    except ValueError as e:
        logger.error("Token generation failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error during token generation", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during authentication")

@router.post("/revoke", response_model=TokenRevokeResponse)
async def revoke_token(
    request: TokenRevokeRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Revoke an active service token"""
    try:
        result = auth_service.revoke_token(request.token)
        return result
    except Exception as e:
        logger.error("Token revocation failed", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/verify", dependencies=[Security(verify_service_auth)])
@requires_role("read")
async def verify_auth(request: Request):
    """Verify service authentication and return token payload"""
    # Token payload is already verified by the dependency
    payload = request.state.token_payload
    return {
        "status": "authenticated",
        "service": payload.get("sub"),
        "roles": payload.get("roles"),
        "exp": payload.get("exp")
    }

@router.get("/health", response_model=AuthHealthCheckResponse)
async def auth_health():
    """Authentication service health check endpoint"""
    return AuthHealthCheckResponse(
        status="operational",
        service="ai-engine-service-auth",
        auth_enabled=True
    )
