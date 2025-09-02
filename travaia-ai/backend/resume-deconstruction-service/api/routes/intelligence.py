"""
Resume Intelligence API Routes
Advanced AI insights and market intelligence for resumes
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
from services.market_intelligence import MarketIntelligence
from services.skill_analyzer import SkillAnalyzer

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class IntelligenceRequest(BaseModel):
    resumeId: str
    analysisType: str = "market_fit"  # market_fit, skill_gap, salary_insights, career_path
    targetRole: Optional[str] = None
    targetIndustry: Optional[str] = None
    location: Optional[str] = None

class MarketFitResult(BaseModel):
    overallFit: float
    industryAlignment: Dict[str, Any]
    roleAlignment: Dict[str, Any]
    skillsMatch: Dict[str, Any]
    experienceMatch: Dict[str, Any]
    competitiveAnalysis: Dict[str, Any]

class SkillGapResult(BaseModel):
    currentSkills: List[Dict[str, Any]]
    requiredSkills: List[Dict[str, Any]]
    skillGaps: List[Dict[str, Any]]
    learningRecommendations: List[Dict[str, Any]]
    prioritySkills: List[Dict[str, Any]]

class SalaryInsight(BaseModel):
    estimatedRange: Dict[str, float]
    marketComparison: Dict[str, Any]
    factorsInfluencingSalary: List[Dict[str, Any]]
    improvementSuggestions: List[Dict[str, Any]]

class CareerPathResult(BaseModel):
    currentLevel: str
    possiblePaths: List[Dict[str, Any]]
    nextSteps: List[Dict[str, Any]]
    timelineEstimates: Dict[str, Any]
    skillRequirements: Dict[str, Any]

class IntelligenceResult(BaseModel):
    resumeId: str
    analysisType: str
    marketFit: Optional[MarketFitResult] = None
    skillGap: Optional[SkillGapResult] = None
    salaryInsights: Optional[SalaryInsight] = None
    careerPath: Optional[CareerPathResult] = None
    recommendations: List[Dict[str, Any]]
    confidence: float

class IntelligenceResponse(BaseModel):
    success: bool
    result: Optional[IntelligenceResult] = None
    message: str
    timestamp: str

@router.post("/analyze", response_model=IntelligenceResponse)
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def analyze_intelligence(
    request: Request,
    intelligence_request: IntelligenceRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform advanced AI intelligence analysis on resume
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume data from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(intelligence_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize intelligence services
        market_intelligence = MarketIntelligence()
        skill_analyzer = SkillAnalyzer()
        
        # Create result object
        intelligence_result = IntelligenceResult(
            resumeId=intelligence_request.resumeId,
            analysisType=intelligence_request.analysisType,
            recommendations=[],
            confidence=0.0
        )
        
        # Perform analysis based on type
        if intelligence_request.analysisType == "market_fit":
            market_fit = await market_intelligence.analyze_market_fit(
                resume_data,
                target_role=intelligence_request.targetRole,
                target_industry=intelligence_request.targetIndustry,
                location=intelligence_request.location
            )
            intelligence_result.marketFit = market_fit
            intelligence_result.confidence = market_fit.overallFit
            
        elif intelligence_request.analysisType == "skill_gap":
            skill_gap = await skill_analyzer.analyze_skill_gaps(
                resume_data,
                target_role=intelligence_request.targetRole,
                target_industry=intelligence_request.targetIndustry
            )
            intelligence_result.skillGap = skill_gap
            intelligence_result.confidence = len(skill_gap.currentSkills) / max(len(skill_gap.requiredSkills), 1)
            
        elif intelligence_request.analysisType == "salary_insights":
            salary_insights = await market_intelligence.analyze_salary_potential(
                resume_data,
                target_role=intelligence_request.targetRole,
                location=intelligence_request.location
            )
            intelligence_result.salaryInsights = salary_insights
            intelligence_result.confidence = 0.8  # Static confidence for salary analysis
            
        elif intelligence_request.analysisType == "career_path":
            career_path = await market_intelligence.analyze_career_path(
                resume_data,
                target_industry=intelligence_request.targetIndustry
            )
            intelligence_result.careerPath = career_path
            intelligence_result.confidence = 0.75  # Static confidence for career path
        
        # Generate comprehensive recommendations
        intelligence_result.recommendations = await market_intelligence.generate_recommendations(
            resume_data, intelligence_result
        )
        
        # Store intelligence results
        intelligence_doc = {
            "resumeId": intelligence_request.resumeId,
            "userId": user_id,
            "analysisType": intelligence_request.analysisType,
            "targetRole": intelligence_request.targetRole,
            "targetIndustry": intelligence_request.targetIndustry,
            "location": intelligence_request.location,
            "result": intelligence_result.dict(),
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        intelligence_id = f"intelligence_{intelligence_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("resume_intelligence").document(intelligence_id).set(intelligence_doc)
        
        # Update resume with latest intelligence
        await db.collection("resumes").document(intelligence_request.resumeId).update({
            "lastIntelligence": {
                "id": intelligence_id,
                "type": intelligence_request.analysisType,
                "confidence": intelligence_result.confidence,
                "timestamp": datetime.now().isoformat()
            },
            "updatedAt": datetime.now().isoformat()
        })
        
        return IntelligenceResponse(
            success=True,
            result=intelligence_result,
            message="Intelligence analysis completed successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Intelligence analysis failed: {str(e)}"
        )

@router.get("/market-trends")
@limiter.limit("20/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_market_trends(
    request: Request,
    industry: Optional[str] = None,
    role: Optional[str] = None,
    location: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get current market trends and insights
    """
    try:
        # Initialize market intelligence
        market_intelligence = MarketIntelligence()
        
        # Get market trends
        trends = await market_intelligence.get_market_trends(
            industry=industry,
            role=role,
            location=location
        )
        
        return {
            "success": True,
            "trends": trends,
            "filters": {
                "industry": industry,
                "role": role,
                "location": location
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving market trends: {str(e)}"
        )

@router.get("/skill-demand")
@limiter.limit("20/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_skill_demand(
    request: Request,
    industry: Optional[str] = None,
    role: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get current skill demand and trends
    """
    try:
        # Initialize skill analyzer
        skill_analyzer = SkillAnalyzer()
        
        # Get skill demand data
        skill_demand = await skill_analyzer.get_skill_demand(
            industry=industry,
            role=role
        )
        
        return {
            "success": True,
            "skillDemand": skill_demand,
            "filters": {
                "industry": industry,
                "role": role
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving skill demand: {str(e)}"
        )

@router.post("/benchmark")
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def benchmark_resume(
    request: Request,
    resume_id: str,
    benchmark_type: str = "industry",  # industry, role, experience_level
    current_user: dict = Depends(get_current_user)
):
    """
    Benchmark resume against market standards
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
        
        # Initialize market intelligence
        market_intelligence = MarketIntelligence()
        
        # Perform benchmarking
        benchmark_result = await market_intelligence.benchmark_resume(
            resume_data,
            benchmark_type=benchmark_type
        )
        
        # Store benchmark results
        benchmark_doc = {
            "resumeId": resume_id,
            "userId": user_id,
            "benchmarkType": benchmark_type,
            "result": benchmark_result,
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        benchmark_id = f"benchmark_{resume_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        await db.collection("resume_benchmarks").document(benchmark_id).set(benchmark_doc)
        
        return {
            "success": True,
            "resumeId": resume_id,
            "benchmarkId": benchmark_id,
            "benchmarkType": benchmark_type,
            "result": benchmark_result,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Benchmarking failed: {str(e)}"
        )

@router.get("/intelligence/{resume_id}/history")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_intelligence_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get intelligence analysis history for a resume
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
        
        # Get intelligence history
        intelligence_history = []
        intelligence_docs = await db.collection("resume_intelligence")\
            .where("resumeId", "==", resume_id)\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .limit(10).get()
        
        for doc in intelligence_docs:
            intelligence_data = doc.to_dict()
            intelligence_history.append({
                "id": doc.id,
                "analysisType": intelligence_data.get("analysisType"),
                "targetRole": intelligence_data.get("targetRole"),
                "targetIndustry": intelligence_data.get("targetIndustry"),
                "confidence": intelligence_data.get("result", {}).get("confidence"),
                "createdAt": intelligence_data.get("createdAt")
            })
        
        return {
            "resumeId": resume_id,
            "intelligenceHistory": intelligence_history,
            "totalCount": len(intelligence_history)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving intelligence history: {str(e)}"
        )
