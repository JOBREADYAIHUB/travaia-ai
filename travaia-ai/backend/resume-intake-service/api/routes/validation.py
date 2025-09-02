"""
Resume Validation API Routes
Handles resume data validation and quality checks
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.auth import verify_firebase_token, get_current_user
from shared.database_pool import get_firestore_client
from shared.circuit_breaker import circuit_breaker
from services.validation_service import ValidationService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class ValidationRequest(BaseModel):
    resumeData: Dict[str, Any]
    validationType: str = "full"  # full, basic, structure

class ValidationResult(BaseModel):
    isValid: bool
    score: float
    errors: List[Dict[str, Any]]
    warnings: List[Dict[str, Any]]
    suggestions: List[Dict[str, Any]]
    completeness: Dict[str, Any]

class ValidationResponse(BaseModel):
    resumeId: Optional[str] = None
    validationResult: ValidationResult
    timestamp: str

@router.post("/validate", response_model=ValidationResponse)
@limiter.limit("20/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def validate_resume_data(
    request: Request,
    validation_request: ValidationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate resume data structure and content
    """
    try:
        user_id = current_user["uid"]
        
        # Initialize validation service
        validation_service = ValidationService()
        
        # Perform validation based on type
        if validation_request.validationType == "basic":
            validation_result = await validation_service.validate_basic(
                validation_request.resumeData
            )
        elif validation_request.validationType == "structure":
            validation_result = await validation_service.validate_structure(
                validation_request.resumeData
            )
        else:  # full validation
            validation_result = await validation_service.validate_full(
                validation_request.resumeData
            )
        
        return ValidationResponse(
            validationResult=validation_result,
            timestamp=datetime.now().isoformat()
        )
        
    except ValidationError as e:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Validation request format error",
                "errors": e.errors()
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during validation: {str(e)}"
        )

@router.post("/validate/{resume_id}", response_model=ValidationResponse)
@limiter.limit("15/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def validate_stored_resume(
    request: Request,
    resume_id: str,
    validation_type: str = "full",
    current_user: dict = Depends(get_current_user)
):
    """
    Validate a stored resume by ID
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
        
        # Extract resume data for validation
        validation_data = {
            "personalInfo": resume_data.get("personalInfo", {}),
            "summary": resume_data.get("summary"),
            "experience": resume_data.get("experience", []),
            "education": resume_data.get("education", []),
            "skills": resume_data.get("skills", []),
            "certifications": resume_data.get("certifications", [])
        }
        
        # Initialize validation service
        validation_service = ValidationService()
        
        # Perform validation
        if validation_type == "basic":
            validation_result = await validation_service.validate_basic(validation_data)
        elif validation_type == "structure":
            validation_result = await validation_service.validate_structure(validation_data)
        else:  # full validation
            validation_result = await validation_service.validate_full(validation_data)
        
        # Update resume with validation results
        await db.collection("resumes").document(resume_id).update({
            "lastValidation": {
                "result": validation_result.dict(),
                "timestamp": datetime.now().isoformat(),
                "type": validation_type
            },
            "updatedAt": datetime.now().isoformat()
        })
        
        return ValidationResponse(
            resumeId=resume_id,
            validationResult=validation_result,
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error validating stored resume: {str(e)}"
        )

@router.get("/validate/{resume_id}/history")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_validation_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get validation history for a resume
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
        
        # Get validation history from sub-collection
        validation_history = []
        validation_docs = await db.collection("resumes").document(resume_id)\
            .collection("validations").order_by("timestamp", direction="desc")\
            .limit(10).get()
        
        for doc in validation_docs:
            validation_history.append({
                "id": doc.id,
                **doc.to_dict()
            })
        
        return {
            "resumeId": resume_id,
            "validationHistory": validation_history,
            "lastValidation": resume_data.get("lastValidation")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving validation history: {str(e)}"
        )

@router.post("/validate/batch")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def validate_multiple_resumes(
    request: Request,
    resume_ids: List[str],
    validation_type: str = "basic",
    current_user: dict = Depends(get_current_user)
):
    """
    Validate multiple resumes in batch
    """
    try:
        user_id = current_user["uid"]
        
        if len(resume_ids) > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 resumes can be validated in batch"
            )
        
        # Initialize validation service
        validation_service = ValidationService()
        db = get_firestore_client()
        
        results = []
        
        for resume_id in resume_ids:
            try:
                # Get resume from Firestore
                resume_doc = await db.collection("resumes").document(resume_id).get()
                
                if not resume_doc.exists:
                    results.append({
                        "resumeId": resume_id,
                        "error": "Resume not found",
                        "status": "failed"
                    })
                    continue
                
                resume_data = resume_doc.to_dict()
                
                # Verify ownership
                if resume_data.get("userId") != user_id:
                    results.append({
                        "resumeId": resume_id,
                        "error": "Access denied",
                        "status": "failed"
                    })
                    continue
                
                # Extract validation data
                validation_data = {
                    "personalInfo": resume_data.get("personalInfo", {}),
                    "summary": resume_data.get("summary"),
                    "experience": resume_data.get("experience", []),
                    "education": resume_data.get("education", []),
                    "skills": resume_data.get("skills", []),
                    "certifications": resume_data.get("certifications", [])
                }
                
                # Perform validation
                if validation_type == "basic":
                    validation_result = await validation_service.validate_basic(validation_data)
                elif validation_type == "structure":
                    validation_result = await validation_service.validate_structure(validation_data)
                else:
                    validation_result = await validation_service.validate_full(validation_data)
                
                results.append({
                    "resumeId": resume_id,
                    "validationResult": validation_result.dict(),
                    "status": "success"
                })
                
            except Exception as e:
                results.append({
                    "resumeId": resume_id,
                    "error": str(e),
                    "status": "failed"
                })
        
        return {
            "batchResults": results,
            "timestamp": datetime.now().isoformat(),
            "validationType": validation_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error in batch validation: {str(e)}"
        )
