"""
Interview Feedback Routes - AI-powered feedback generation
"""

"""
Interview Feedback Routes - AI-powered feedback generation
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import uuid
import structlog
import time

from services.vertex_ai_service import VertexAIService
from api.dependencies import get_cache_service, get_vertex_ai_service
from services.cache_service import CacheService
from models.dto import (
    ResponseAnalysisRequest,
    InterviewFeedbackRequest,
    ComprehensiveFeedbackRequest,
)
from models.domain import (
    ResponseAnalysisResponse,
    InterviewFeedbackResponse,
    ComprehensiveFeedbackResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/analyze-response", response_model=ResponseAnalysisResponse)
async def analyze_interview_response(
    request: ResponseAnalysisRequest,
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """Analyze individual interview response with detailed feedback"""
    try:
        logger.info("Response analysis started", question_length=len(request.question), language=request.language)
        
        if not request.question.strip() or not request.response.strip():
            raise HTTPException(status_code=400, detail="Question and response required")
        
        # Generate a cache key for this response analysis request
        cache_data = {
            "question": request.question,
            "response": request.response,
            "job_description": request.job_description,
            "language": request.language
        }
        cache_key = cache_service.generate_key("response_analysis", cache_data)
        
        # Check cache first
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info("Using cached response analysis result", cache_key=cache_key)
            analysis_id = cached_result.get("analysis_id")
            analysis_result = cached_result.get("result")
        else:
            # Perform analysis with language support
            analysis_result = await vertex_service.analyze_interview_response(
                question=request.question,
                response=request.response,
                job_description=request.job_description,
                language=request.language
            )
            
            # Generate unique analysis ID
            analysis_id = str(uuid.uuid4())
            
            # Cache the result for future requests
            await cache_service.set(cache_key, {
                "analysis_id": analysis_id,
                "result": analysis_result,
                "timestamp": time.time()
            })
        
        return ResponseAnalysisResponse(
            overall_score=analysis_result.get("overall_score", 0.0),
            content_score=analysis_result.get("content_score", 0.0),
            communication_score=analysis_result.get("communication_score", 0.0),
            technical_score=analysis_result.get("technical_score", 0.0),
            behavioral_score=analysis_result.get("behavioral_score", 0.0),
            strengths=analysis_result.get("strengths", []),
            improvements=analysis_result.get("improvements", []),
            sentiment=analysis_result.get("sentiment", "neutral"),
            confidence_indicators=analysis_result.get("confidence_indicators", []),
            key_phrases=analysis_result.get("key_phrases", []),
            language=analysis_result.get("language", request.language)
        )
        
    except Exception as e:
        logger.error("Response analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/generate-feedback", response_model=InterviewFeedbackResponse)
async def generate_interview_feedback(
    request: InterviewFeedbackRequest,
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """Generate comprehensive interview feedback report"""
    try:
        logger.info("Comprehensive feedback generation started", 
                   interview_id=request.interview_id,
                   response_count=len(request.question_responses),
                   language=request.language)
        
        if not request.question_responses:
            raise HTTPException(status_code=400, detail="Interview responses required")
        
        # Generate a cache key for this interview feedback request
        cache_data = {
            "interview_transcript": request.interview_transcript,
            "job_description": request.job_description,
            "question_responses": request.question_responses,
            "language": request.language
        }
        cache_key = cache_service.generate_key("interview_feedback", cache_data)
        
        # Check cache first
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info("Using cached interview feedback", cache_key=cache_key)
            feedback_id = cached_result.get("feedback_id")
            feedback_data = cached_result.get("result")
        else:
            # Generate comprehensive feedback with language support
            feedback_data = await vertex_service.generate_interview_feedback(
                interview_transcript=request.interview_transcript,
                job_description=request.job_description,
                question_responses=request.question_responses,
                language=request.language
            )
            
            # Generate unique feedback ID
            feedback_id = str(uuid.uuid4())
            
            # Cache the result for future requests
            await cache_service.set(cache_key, {
                "feedback_id": feedback_id,
                "result": feedback_data,
                "timestamp": time.time()
            })
        
        return InterviewFeedbackResponse(
            feedback_id=feedback_id,
            overall_score=feedback_data.get("overall_score", 0.0),
            category_scores=feedback_data.get("category_scores", {}),
            strengths=feedback_data.get("strengths", []),
            improvements=feedback_data.get("improvements", []),
            detailed_feedback=feedback_data.get("detailed_feedback", ""),
            next_steps=feedback_data.get("next_steps", []),
            interview_readiness=feedback_data.get("interview_readiness", "Not ready"),
            recommended_focus_areas=feedback_data.get("recommended_focus_areas", []),
            language=feedback_data.get("language", request.language)
        )
        
    except Exception as e:
        logger.error("Feedback generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {str(e)}")

@router.post("/comprehensive-feedback", response_model=ComprehensiveFeedbackResponse)
async def generate_comprehensive_feedback(
    request: ComprehensiveFeedbackRequest,
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """Generate comprehensive interview feedback report"""
    try:
        logger.info("Comprehensive feedback generation started", 
                   interview_id=request.interview_id,
                   response_count=len(request.responses),
                   language=request.language)
        
        if not request.responses:
            raise HTTPException(status_code=400, detail="Interview responses required")
        
        # Prepare interview data
        interview_data = {
            "interview_id": request.interview_id,
            "responses": request.responses,
            "user_profile": request.user_profile,
            "job_title": request.job_title,
            "duration": request.duration,
            "language": request.language
        }
        
        # Generate a cache key for this comprehensive feedback request
        cache_data = {
            "interview_id": request.interview_id,
            "responses": request.responses,
            "user_profile": request.user_profile,
            "job_title": request.job_title,
            "duration": request.duration,
            "language": request.language
        }
        cache_key = cache_service.generate_key("comprehensive_feedback", cache_data)
        
        # Check cache first
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info("Using cached comprehensive feedback", cache_key=cache_key)
            report_id = cached_result.get("report_id")
            result = cached_result.get("result")
        else:
            # Generate comprehensive feedback with language support
            result = await vertex_service.generate_comprehensive_feedback(interview_data)
            
            # Generate unique report ID
            report_id = str(uuid.uuid4())
            
            # Cache the result for future requests
            await cache_service.set(cache_key, {
                "report_id": report_id,
                "result": result,
                "timestamp": time.time()
            })
        
        return ComprehensiveFeedbackResponse(
            report_id=report_id,
            overall_score=result.get("overall_score", 0.0),
            category_scores=result.get("category_scores", {}),
            strengths=result.get("strengths", []),
            improvements=result.get("improvements", []),
            detailed_feedback=result.get("detailed_feedback", ""),
            next_steps=result.get("next_steps", []),
            interview_readiness=result.get("interview_readiness", "Not ready"),
            recommended_focus_areas=result.get("recommended_focus_areas", []),
            language=result.get("language", request.language)
        )
        
    except Exception as e:
        logger.error("Feedback generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {str(e)}")

@router.get("/feedback-templates")
async def get_feedback_templates():
    """Get feedback templates and scoring criteria"""
    return {
        "scoring_criteria": {
            "communication": {
                "description": "Clarity, structure, and articulation",
                "weight": 0.25,
                "factors": ["clarity", "structure", "confidence", "pace"]
            },
            "technical": {
                "description": "Technical knowledge and problem-solving",
                "weight": 0.30,
                "factors": ["accuracy", "depth", "examples", "methodology"]
            },
            "behavioral": {
                "description": "Leadership, teamwork, and soft skills",
                "weight": 0.25,
                "factors": ["leadership", "teamwork", "adaptability", "initiative"]
            },
            "cultural_fit": {
                "description": "Alignment with company values and culture",
                "weight": 0.20,
                "factors": ["values", "motivation", "enthusiasm", "questions"]
            }
        },
        "feedback_templates": {
            "strengths": [
                "Excellent communication skills demonstrated throughout",
                "Strong technical knowledge with relevant examples",
                "Clear problem-solving approach and methodology",
                "Good understanding of the role requirements"
            ],
            "improvements": [
                "Could provide more specific examples with metrics",
                "Consider structuring responses using STAR method",
                "Show more confidence when discussing achievements",
                "Ask more insightful questions about the role"
            ]
        }
    }