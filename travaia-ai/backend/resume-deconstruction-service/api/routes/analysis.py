"""
Resume Analysis API Routes
AI-powered resume content analysis using Gemini AI
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
from services.ai_analyzer import AIAnalyzer
from services.content_analyzer import ContentAnalyzer

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class AnalysisRequest(BaseModel):
    resumeId: str
    analysisType: str = "comprehensive"  # comprehensive, quick, targeted
    focusAreas: List[str] = []  # skills, experience, education, formatting

class AnalysisResult(BaseModel):
    resumeId: str
    analysisType: str
    overallScore: float
    strengths: List[Dict[str, Any]]
    weaknesses: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    skillsAnalysis: Dict[str, Any]
    experienceAnalysis: Dict[str, Any]
    educationAnalysis: Dict[str, Any]
    contentQuality: Dict[str, Any]
    atsCompatibility: Dict[str, Any]
    marketAlignment: Dict[str, Any]

class AnalysisResponse(BaseModel):
    success: bool
    result: Optional[AnalysisResult] = None
    message: str
    timestamp: str

@router.post("/analyze", response_model=AnalysisResponse)
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def analyze_resume(
    request: Request,
    analysis_request: AnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform AI-powered resume analysis
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume data from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(analysis_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize AI analyzer
        ai_analyzer = AIAnalyzer()
        content_analyzer = ContentAnalyzer()
        
        # Perform analysis based on type
        if analysis_request.analysisType == "quick":
            analysis_result = await ai_analyzer.quick_analysis(
                resume_data, analysis_request.focusAreas
            )
        elif analysis_request.analysisType == "targeted":
            analysis_result = await ai_analyzer.targeted_analysis(
                resume_data, analysis_request.focusAreas
            )
        else:  # comprehensive
            analysis_result = await ai_analyzer.comprehensive_analysis(resume_data)
        
        # Enhance with content analysis
        content_analysis = await content_analyzer.analyze_content_quality(resume_data)
        analysis_result.contentQuality = content_analysis
        
        # Store analysis results
        analysis_doc = {
            "resumeId": analysis_request.resumeId,
            "userId": user_id,
            "analysisType": analysis_request.analysisType,
            "focusAreas": analysis_request.focusAreas,
            "result": analysis_result.dict(),
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        analysis_id = f"analysis_{analysis_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("resume_analyses").document(analysis_id).set(analysis_doc)
        
        # Update resume with latest analysis
        await db.collection("resumes").document(analysis_request.resumeId).update({
            "lastAnalysis": {
                "id": analysis_id,
                "type": analysis_request.analysisType,
                "score": analysis_result.overallScore,
                "timestamp": datetime.now().isoformat()
            },
            "updatedAt": datetime.now().isoformat()
        })
        
        return AnalysisResponse(
            success=True,
            result=analysis_result,
            message="Resume analysis completed successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@router.get("/analyze/{resume_id}/history")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_analysis_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get analysis history for a resume
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
        
        # Get analysis history
        analyses = []
        analysis_docs = await db.collection("resume_analyses")\
            .where("resumeId", "==", resume_id)\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .limit(10).get()
        
        for doc in analysis_docs:
            analysis_data = doc.to_dict()
            analyses.append({
                "id": doc.id,
                "analysisType": analysis_data.get("analysisType"),
                "overallScore": analysis_data.get("result", {}).get("overallScore"),
                "createdAt": analysis_data.get("createdAt"),
                "focusAreas": analysis_data.get("focusAreas", [])
            })
        
        return {
            "resumeId": resume_id,
            "analyses": analyses,
            "totalCount": len(analyses)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analysis history: {str(e)}"
        )

@router.get("/analyze/{analysis_id}/details")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_analysis_details(
    request: Request,
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed analysis results
    """
    try:
        user_id = current_user["uid"]
        
        # Get analysis document
        db = get_firestore_client()
        analysis_doc = await db.collection("resume_analyses").document(analysis_id).get()
        
        if not analysis_doc.exists:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        analysis_data = analysis_doc.to_dict()
        
        # Verify ownership
        if analysis_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "id": analysis_id,
            "resumeId": analysis_data.get("resumeId"),
            "analysisType": analysis_data.get("analysisType"),
            "focusAreas": analysis_data.get("focusAreas", []),
            "result": analysis_data.get("result"),
            "createdAt": analysis_data.get("createdAt"),
            "version": analysis_data.get("version")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analysis details: {str(e)}"
        )

@router.post("/compare")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def compare_analyses(
    request: Request,
    analysis_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Compare multiple resume analyses
    """
    try:
        user_id = current_user["uid"]
        
        if len(analysis_ids) < 2 or len(analysis_ids) > 5:
            raise HTTPException(
                status_code=400,
                detail="Can compare between 2-5 analyses"
            )
        
        # Get all analyses
        db = get_firestore_client()
        analyses = []
        
        for analysis_id in analysis_ids:
            analysis_doc = await db.collection("resume_analyses").document(analysis_id).get()
            
            if not analysis_doc.exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Analysis {analysis_id} not found"
                )
            
            analysis_data = analysis_doc.to_dict()
            
            # Verify ownership
            if analysis_data.get("userId") != user_id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            analyses.append({
                "id": analysis_id,
                "createdAt": analysis_data.get("createdAt"),
                "analysisType": analysis_data.get("analysisType"),
                "result": analysis_data.get("result")
            })
        
        # Initialize content analyzer for comparison
        content_analyzer = ContentAnalyzer()
        comparison_result = await content_analyzer.compare_analyses(analyses)
        
        return {
            "analyses": analyses,
            "comparison": comparison_result,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing analyses: {str(e)}"
        )
