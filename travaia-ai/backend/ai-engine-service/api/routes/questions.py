"""
Interview Questions Routes - AI-powered question generation
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
import uuid
import structlog
import time

from services.vertex_ai_service import VertexAIService
from api.dependencies import get_cache_service, get_vertex_ai_service
from services.cache_service import CacheService
from models.dto import InterviewQuestionsRequest, ValidateQuestionsRequest
from models.domain import (
    InterviewQuestionsResponse,
    QuestionTemplate,
    QuestionTemplatesResponse,
    ValidateQuestionsResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/generate-questions", response_model=InterviewQuestionsResponse)
async def generate_interview_questions(
    request: InterviewQuestionsRequest,
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """Generate AI-powered interview questions tailored to job and candidate"""
    try:
        logger.info("Question generation started", 
                   difficulty=request.difficulty_level, 
                   count=request.question_count,
                   language=request.language)
        
        # Validate input
        if not request.job_description.strip():
            raise HTTPException(status_code=400, detail="Job description required")
        
        if request.question_count < 1 or request.question_count > 50:
            raise HTTPException(status_code=400, detail="Question count must be between 1 and 50")
        
        # Generate a cache key for this question generation request
        cache_data = {
            "job_description": request.job_description,
            "question_count": request.question_count,
            "difficulty_level": request.difficulty_level,
            "question_types": request.question_types,
            "specific_skills": request.specific_skills,
            "language": request.language
        }
        cache_key = cache_service.generate_key("interview_questions", cache_data)
        
        # Check cache first
        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info("Using cached interview questions", cache_key=cache_key)
            questions_id = cached_result.get("questions_id")
            questions_data = cached_result.get("result")
        else:
            # Generate the interview questions with language support
            questions_data = await vertex_service.generate_interview_questions(
                job_description=request.job_description,
                question_count=request.question_count,
                difficulty_level=request.difficulty_level,
                question_types=request.question_types,
                specific_skills=request.specific_skills,
                language=request.language
            )
            
            # Generate a unique ID for this set of questions
            questions_id = str(uuid.uuid4())
            
            # Cache the result for future requests
            await cache_service.set(cache_key, {
                "questions_id": questions_id,
                "result": questions_data,
                "timestamp": time.time()
            })
        
        response = InterviewQuestionsResponse(
            question_set_id=questions_id,
            questions=questions_data.get("questions", []),
            question_types=questions_data.get("question_types", request.question_types),
            difficulty_level=questions_data.get("difficulty_level", request.difficulty_level),
            estimated_duration=questions_data.get("estimated_duration", request.question_count * 3),
            language=request.language
        )
        
        logger.info("Questions generated successfully", 
                   question_set_id=questions_id,
                   count=len(response.questions))
        
        return response
        
    except Exception as e:
        logger.error("Question generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

@router.get("/question-templates", response_model=QuestionTemplatesResponse)
async def get_question_templates(
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    language: str = "en",
):
    """Get pre-built question templates."""
    all_templates_dict = {
        "behavioral": [
            "Tell me about a time when you had to overcome a significant challenge.",
            "Describe a situation where you had to work with a difficult team member.",
            "Give me an example of when you showed leadership skills.",
        ],
        "technical": [
            "How would you approach solving this technical problem?",
            "Explain your experience with [relevant technology].",
            "Walk me through your development process.",
        ],
        "situational": [
            "How would you handle a tight deadline with competing priorities?",
            "What would you do if you disagreed with your manager's decision?",
            "How would you approach learning a new technology quickly?",
        ],
    }

    if category and category in all_templates_dict:
        templates_to_return = [
            QuestionTemplate(category=category, templates=all_templates_dict[category])
        ]
        total_categories = 1
    else:
        templates_to_return = [
            QuestionTemplate(category=cat, templates=tpls)
            for cat, tpls in all_templates_dict.items()
        ]
        total_categories = len(templates_to_return)

    return QuestionTemplatesResponse(
        templates=templates_to_return, total_categories=total_categories
    )

@router.post("/validate-questions", response_model=ValidateQuestionsResponse)
async def validate_question_quality(request: ValidateQuestionsRequest):
    """Validate and score question quality."""
    # TODO: Implement question quality validation
    return ValidateQuestionsResponse(
        questions=request.questions,
        quality_scores=[0.8] * len(request.questions),
        suggestions=["Questions look good"],
        overall_quality="good",
    )