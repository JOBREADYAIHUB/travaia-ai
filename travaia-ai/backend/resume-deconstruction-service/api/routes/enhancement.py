"""
Resume Enhancement API Routes
AI-powered resume content enhancement and optimization
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.auth import verify_firebase_token, get_current_user
from shared.database_pool import get_firestore_client
from shared.circuit_breaker import circuit_breaker
from services.ai_enhancer import AIEnhancer
from services.content_optimizer import ContentOptimizer

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class EnhancementRequest(BaseModel):
    resumeId: str
    enhancementType: str = "comprehensive"  # comprehensive, targeted, ats_optimization
    targetRole: Optional[str] = None
    targetIndustry: Optional[str] = None
    focusAreas: List[str] = []  # summary, experience, skills, keywords

class EnhancementSuggestion(BaseModel):
    section: str
    field: str
    originalContent: str
    suggestedContent: str
    reason: str
    priority: str  # high, medium, low
    impact: str  # high, medium, low

class EnhancementResult(BaseModel):
    resumeId: str
    enhancementType: str
    suggestions: List[EnhancementSuggestion]
    keywordOptimization: Dict[str, Any]
    atsScore: float
    readabilityScore: float
    impactScore: float
    overallImprovement: float

class EnhancementResponse(BaseModel):
    success: bool
    result: Optional[EnhancementResult] = None
    message: str
    timestamp: str

@router.post("/enhance", response_model=EnhancementResponse)
@limiter.limit("8/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def enhance_resume(
    request: Request,
    enhancement_request: EnhancementRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate AI-powered resume enhancement suggestions
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume data from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(enhancement_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize enhancement services
        ai_enhancer = AIEnhancer()
        content_optimizer = ContentOptimizer()
        
        # Perform enhancement based on type
        if enhancement_request.enhancementType == "targeted":
            enhancement_result = await ai_enhancer.targeted_enhancement(
                resume_data,
                target_role=enhancement_request.targetRole,
                target_industry=enhancement_request.targetIndustry,
                focus_areas=enhancement_request.focusAreas
            )
        elif enhancement_request.enhancementType == "ats_optimization":
            enhancement_result = await ai_enhancer.ats_optimization(
                resume_data,
                target_role=enhancement_request.targetRole
            )
        else:  # comprehensive
            enhancement_result = await ai_enhancer.comprehensive_enhancement(resume_data)
        
        # Add content optimization
        optimization_result = await content_optimizer.optimize_content(
            resume_data, enhancement_result.suggestions
        )
        
        enhancement_result.keywordOptimization = optimization_result.get("keywords", {})
        enhancement_result.atsScore = optimization_result.get("atsScore", 0.0)
        enhancement_result.readabilityScore = optimization_result.get("readabilityScore", 0.0)
        
        # Store enhancement results
        enhancement_doc = {
            "resumeId": enhancement_request.resumeId,
            "userId": user_id,
            "enhancementType": enhancement_request.enhancementType,
            "targetRole": enhancement_request.targetRole,
            "targetIndustry": enhancement_request.targetIndustry,
            "focusAreas": enhancement_request.focusAreas,
            "result": enhancement_result.dict(),
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        enhancement_id = f"enhancement_{enhancement_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("resume_enhancements").document(enhancement_id).set(enhancement_doc)
        
        # Update resume with latest enhancement
        await db.collection("resumes").document(enhancement_request.resumeId).update({
            "lastEnhancement": {
                "id": enhancement_id,
                "type": enhancement_request.enhancementType,
                "improvementScore": enhancement_result.overallImprovement,
                "timestamp": datetime.now().isoformat()
            },
            "updatedAt": datetime.now().isoformat()
        })
        
        return EnhancementResponse(
            success=True,
            result=enhancement_result,
            message="Resume enhancement completed successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Enhancement failed: {str(e)}"
        )

@router.post("/apply-suggestions")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def apply_enhancement_suggestions(
    request: Request,
    enhancement_id: str,
    selected_suggestions: List[str],  # List of suggestion IDs to apply
    current_user: dict = Depends(get_current_user)
):
    """
    Apply selected enhancement suggestions to resume
    """
    try:
        user_id = current_user["uid"]
        
        # Get enhancement document
        db = get_firestore_client()
        enhancement_doc = await db.collection("resume_enhancements").document(enhancement_id).get()
        
        if not enhancement_doc.exists:
            raise HTTPException(status_code=404, detail="Enhancement not found")
        
        enhancement_data = enhancement_doc.to_dict()
        
        # Verify ownership
        if enhancement_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        resume_id = enhancement_data.get("resumeId")
        
        # Get current resume data
        resume_doc = await db.collection("resumes").document(resume_id).get()
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Apply selected suggestions
        content_optimizer = ContentOptimizer()
        updated_resume = await content_optimizer.apply_suggestions(
            resume_data,
            enhancement_data.get("result", {}).get("suggestions", []),
            selected_suggestions
        )
        
        # Update resume in Firestore
        await db.collection("resumes").document(resume_id).update({
            **updated_resume,
            "updatedAt": datetime.now().isoformat(),
            "version": str(float(resume_data.get("version", "1.0")) + 0.1)
        })
        
        # Create version history entry
        version_doc = {
            "resumeId": resume_id,
            "userId": user_id,
            "enhancementId": enhancement_id,
            "appliedSuggestions": selected_suggestions,
            "previousVersion": resume_data,
            "newVersion": updated_resume,
            "createdAt": datetime.now().isoformat()
        }
        
        version_id = f"version_{resume_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("resume_versions").document(version_id).set(version_doc)
        
        return {
            "success": True,
            "message": f"Applied {len(selected_suggestions)} enhancement suggestions",
            "resumeId": resume_id,
            "versionId": version_id,
            "appliedSuggestions": selected_suggestions,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error applying suggestions: {str(e)}"
        )

@router.get("/enhance/{resume_id}/history")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_enhancement_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get enhancement history for a resume
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get enhancement history
        enhancements = []
        enhancement_docs = await db.collection("resume_enhancements")\
            .where("resumeId", "==", resume_id)\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .limit(10).get()
        
        for doc in enhancement_docs:
            enhancement_data = doc.to_dict()
            enhancements.append({
                "id": doc.id,
                "enhancementType": enhancement_data.get("enhancementType"),
                "targetRole": enhancement_data.get("targetRole"),
                "targetIndustry": enhancement_data.get("targetIndustry"),
                "overallImprovement": enhancement_data.get("result", {}).get("overallImprovement"),
                "suggestionsCount": len(enhancement_data.get("result", {}).get("suggestions", [])),
                "createdAt": enhancement_data.get("createdAt"),
                "focusAreas": enhancement_data.get("focusAreas", [])
            })
        
        return {
            "resumeId": resume_id,
            "enhancements": enhancements,
            "totalCount": len(enhancements)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving enhancement history: {str(e)}"
        )

@router.post("/optimize-keywords")
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def optimize_keywords(
    request: Request,
    resume_id: str,
    job_description: Optional[str] = None,
    target_keywords: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Optimize resume keywords for ATS compatibility
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume data
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize content optimizer
        content_optimizer = ContentOptimizer()
        
        # Perform keyword optimization
        optimization_result = await content_optimizer.optimize_keywords(
            resume_data,
            job_description=job_description,
            target_keywords=target_keywords
        )
        
        # Store optimization results
        optimization_doc = {
            "resumeId": resume_id,
            "userId": user_id,
            "jobDescription": job_description,
            "targetKeywords": target_keywords,
            "result": optimization_result,
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        optimization_id = f"keyword_opt_{resume_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("keyword_optimizations").document(optimization_id).set(optimization_doc)
        
        return {
            "success": True,
            "resumeId": resume_id,
            "optimizationId": optimization_id,
            "result": optimization_result,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Keyword optimization failed: {str(e)}"
        )
