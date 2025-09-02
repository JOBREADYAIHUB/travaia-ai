"""
Application Routes - Job application management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog
from services.application_service import ApplicationService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
app_service = ApplicationService()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error("User token verification failed", error=str(e))
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Pydantic models
class ApplicationCreateRequest(BaseModel):
    user_id: str
    job_title: str
    company_name: str
    job_description: Optional[str] = ""
    link_to_job_post: Optional[str] = ""
    status: Optional[str] = "draft"
    contacts: Optional[List[Dict[str, Any]]] = []

class ApplicationResponse(BaseModel):
    application_id: str
    user_id: str
    job_title: str
    company_name: str
    status: str
    application_date: str
    contacts: List[Dict[str, Any]]
    notes: List[Dict[str, Any]]

class ContactAddRequest(BaseModel):
    name: str
    role: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""

class NoteAddRequest(BaseModel):
    content: str

class StatusUpdateRequest(BaseModel):
    status: str

@router.post("/", response_model=Dict[str, Any])
async def create_application(request: ApplicationCreateRequest, user: dict = Depends(get_current_user)):
    """Create new job application with AI analysis trigger"""
    try:
                user_id = user.get("uid")
        if not user_id:
            raise HTTPException(status_code=403, detail="User not authenticated")
        application = await app_service.create_application(user_id, request.dict())
        return {
            "success": True,
            "application": application,
            "message": "Application created successfully"
        }
    except Exception as e:
        logger.error("Application creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{application_id}")
async def get_application(application_id: str, user: dict = Depends(get_current_user)):
    """Get application by ID"""
    try:
                user_id = user.get("uid")
        if not user_id:
            raise HTTPException(status_code=403, detail="User not authenticated")
        application = await app_service.get_application(application_id, user_id)
        if not application:
            raise HTTPException(status_code=404, detail="Application not found")
        
        return {
            "success": True,
            "application": application
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Application retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve application")

@router.put("/{application_id}/status")
async def update_application_status(
    application_id: str, 
    request: StatusUpdateRequest,
    user_id: str
):
    """Update application status"""
    try:
        success = await app_service.update_application_status(
            application_id, user_id, request.status
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Application not found or unauthorized")
        
        return {
            "success": True,
            "message": f"Status updated to {request.status}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Status update failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update status")

@router.post("/{application_id}/contacts")
async def add_contact(
    application_id: str,
    request: ContactAddRequest,
    user_id: str
):
    """Add contact to application"""
    try:
        success = await app_service.add_contact(
            application_id, user_id, request.dict()
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Application not found or unauthorized")
        
        return {
            "success": True,
            "message": "Contact added successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Contact addition failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to add contact")

@router.post("/{application_id}/notes")
async def add_note(
    application_id: str,
    request: NoteAddRequest,
    user_id: str
):
    """Add note to application"""
    try:
        success = await app_service.add_note(
            application_id, user_id, request.content
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Application not found or unauthorized")
        
        return {
            "success": True,
            "message": "Note added successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Note addition failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to add note")

@router.get("/", response_model=Dict[str, Any])
async def get_user_applications_paginated_route(user: dict = Depends(get_current_user), page: int = 1, limit: int = 10):
    """Get all applications for a user"""
    try:
                user_id = user.get("uid")
        if not user_id:
            raise HTTPException(status_code=403, detail="User not authenticated")
            
        result = await app_service.get_user_applications_paginated(user_id, page, limit)
        return {
            "success": True,
            **result
        }
    except Exception as e:
        logger.error("Applications retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve applications")