"""
Resume Intake API Routes
Handles initial resume data processing and validation
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.auth import verify_firebase_token, get_current_user
from shared.database_pool import get_firestore_client
from shared.circuit_breaker import circuit_breaker
from services.intake_processor import IntakeProcessor
from services.validation_service import ValidationService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class PersonalInfo(BaseModel):
    firstName: str = Field(..., min_length=1, max_length=50)
    lastName: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=50)
    state: Optional[str] = Field(None, max_length=50)
    zipCode: Optional[str] = Field(None, max_length=10)
    linkedinUrl: Optional[str] = Field(None, max_length=200)
    portfolioUrl: Optional[str] = Field(None, max_length=200)

class Experience(BaseModel):
    jobTitle: str = Field(..., min_length=1, max_length=100)
    company: str = Field(..., min_length=1, max_length=100)
    startDate: str = Field(..., description="ISO date string")
    endDate: Optional[str] = Field(None, description="ISO date string")
    currentPosition: bool = False
    description: str = Field(..., min_length=10, max_length=2000)

class Education(BaseModel):
    degree: str = Field(..., min_length=1, max_length=100)
    institution: str = Field(..., min_length=1, max_length=100)
    graduationDate: str = Field(..., description="ISO date string")
    gpa: Optional[str] = Field(None, max_length=10)

class Skill(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    level: str = Field(..., regex="^(beginner|intermediate|advanced|expert)$")

class Certification(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    issuingOrganization: str = Field(..., min_length=1, max_length=100)
    issueDate: str = Field(..., description="ISO date string")
    expirationDate: Optional[str] = Field(None, description="ISO date string")

class ResumeIntakeRequest(BaseModel):
    personalInfo: PersonalInfo
    summary: Optional[str] = Field(None, max_length=1000)
    experience: List[Experience] = []
    education: List[Education] = []
    skills: List[Skill] = []
    certifications: List[Certification] = []

class ResumeIntakeResponse(BaseModel):
    resumeId: str
    status: str
    message: str
    validationResults: Dict[str, Any]
    nextSteps: List[str]

@router.post("/intake", response_model=ResumeIntakeResponse)
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def intake_resume_data(
    request: Request,
    resume_data: ResumeIntakeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Process initial resume data intake
    """
    try:
        user_id = current_user["uid"]
        
        # Initialize services
        intake_processor = IntakeProcessor()
        validation_service = ValidationService()
        
        # Validate resume data
        validation_results = await validation_service.validate_resume_data(resume_data.dict())
        
        if not validation_results["is_valid"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Resume data validation failed",
                    "errors": validation_results["errors"]
                }
            )
        
        # Process intake
        resume_id = await intake_processor.process_intake(
            user_id=user_id,
            resume_data=resume_data.dict()
        )
        
        # Store in Firestore
        db = get_firestore_client()
        resume_doc = {
            "userId": user_id,
            "resumeId": resume_id,
            "status": "intake_complete",
            "personalInfo": resume_data.personalInfo.dict(),
            "summary": resume_data.summary,
            "experience": [exp.dict() for exp in resume_data.experience],
            "education": [edu.dict() for edu in resume_data.education],
            "skills": [skill.dict() for skill in resume_data.skills],
            "certifications": [cert.dict() for cert in resume_data.certifications],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await db.collection("resumes").document(resume_id).set(resume_doc)
        
        # Trigger next stage (deconstruction) via Pub/Sub
        await intake_processor.trigger_deconstruction(resume_id, user_id)
        
        return ResumeIntakeResponse(
            resumeId=resume_id,
            status="intake_complete",
            message="Resume data successfully processed and stored",
            validationResults=validation_results,
            nextSteps=[
                "AI analysis and enhancement",
                "Template selection",
                "Final generation"
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during resume intake: {str(e)}"
        )

@router.get("/intake/{resume_id}/status")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_intake_status(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get status of resume intake process
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "resumeId": resume_id,
            "status": resume_data.get("status", "unknown"),
            "createdAt": resume_data.get("createdAt"),
            "updatedAt": resume_data.get("updatedAt"),
            "version": resume_data.get("version", "1.0")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving intake status: {str(e)}"
        )

@router.put("/intake/{resume_id}")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def update_resume_data(
    request: Request,
    resume_id: str,
    resume_data: ResumeIntakeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update existing resume data
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume exists and user owns it
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        existing_data = resume_doc.to_dict()
        if existing_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Validate updated data
        validation_service = ValidationService()
        validation_results = await validation_service.validate_resume_data(resume_data.dict())
        
        if not validation_results["is_valid"]:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Resume data validation failed",
                    "errors": validation_results["errors"]
                }
            )
        
        # Update resume document
        updated_doc = {
            "personalInfo": resume_data.personalInfo.dict(),
            "summary": resume_data.summary,
            "experience": [exp.dict() for exp in resume_data.experience],
            "education": [edu.dict() for edu in resume_data.education],
            "skills": [skill.dict() for skill in resume_data.skills],
            "certifications": [cert.dict() for cert in resume_data.certifications],
            "updatedAt": datetime.now().isoformat(),
            "status": "updated"
        }
        
        await db.collection("resumes").document(resume_id).update(updated_doc)
        
        return {
            "resumeId": resume_id,
            "status": "updated",
            "message": "Resume data successfully updated",
            "validationResults": validation_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error updating resume data: {str(e)}"
        )
