"""
Job Analysis Routes - Enterprise job fit analysis endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
import structlog

from services.vertex_ai_service import VertexAIService
from api.dependencies import get_cache_service, get_vertex_ai_service
from services.cache_service import CacheService
from models.dto import JobAnalysisRequest
from models.domain import JobAnalysisResponse

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post("/analyze-job", response_model=JobAnalysisResponse)
async def analyze_job_fit(
    request: JobAnalysisRequest,
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """
    Analyze job fit based on user profile and job description.
    Enterprise-grade analysis with detailed insights.
    """
    try:
        logger.info("Job analysis started", user_id=request.user_id, analysis_type=request.analysis_type)

        if not request.job_description.strip():
            raise HTTPException(status_code=400, detail="Job description cannot be empty")
        if not request.user_profile:
            raise HTTPException(status_code=400, detail="User profile cannot be empty")

        cache_data = {
            "user_profile": request.user_profile,
            "job_description": request.job_description,
            "language": request.language
        }
        cache_key = cache_service.generate_key("job_analysis", cache_data)

        cached_result = await cache_service.get(cache_key)
        if cached_result:
            logger.info("Using cached job analysis result", cache_key=cache_key)
            return JobAnalysisResponse(**cached_result)

        analysis_result = await vertex_service.analyze_job_fit(
            user_profile=request.user_profile,
            job_description=request.job_description,
            language=request.language
        )

        report_id = str(uuid.uuid4())
        response_data = {
            "report_id": report_id,
            "job_title": analysis_result.get("job_title", "N/A"),
            "match_score": analysis_result.get("match_score", 0.0),
            "strengths": analysis_result.get("strengths", []),
            "weaknesses": analysis_result.get("weaknesses", []),
            "missing_keywords": analysis_result.get("missing_keywords", []),
            "recommended_skills": analysis_result.get("recommended_skills", []),
            "summary": analysis_result.get("summary", "")
        }
        response = JobAnalysisResponse(**response_data)

        await cache_service.set(cache_key, response.model_dump())

        logger.info(
            "Job analysis completed",
            report_id=response.report_id,
            match_score=response.match_score,
            user_id=request.user_id,
            language=request.language
        )

        return response

    except Exception as e:
        logger.error("Job analysis failed", error=str(e), user_id=request.user_id)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/analysis/{report_id}", response_model=JobAnalysisResponse)
async def get_analysis_result(
    report_id: str,
    cache_service: CacheService = Depends(get_cache_service)
):
    """Get cached analysis result by ID."""
    # This assumes the cache key can be constructed or found based on report_id.
    # For a more robust implementation, a dedicated lookup table (e.g., Redis hash) 
    # mapping report_id to cache_key would be better.
    # This is a simplified search for demonstration.
    all_keys = await cache_service.keys("job_analysis:*")
    for key in all_keys:
        cached_data = await cache_service.get(key)
        if cached_data and cached_data.get("report_id") == report_id:
            logger.info("Found analysis in cache by report_id", report_id=report_id, cache_key=key)
            return JobAnalysisResponse(**cached_data)

    raise HTTPException(status_code=404, detail=f"Analysis with ID {report_id} not found")

@router.post("/batch-analyze", response_model=List[JobAnalysisResponse])
async def batch_analyze_jobs(
    requests: List[JobAnalysisRequest],
    cache_service: CacheService = Depends(get_cache_service),
    vertex_service: VertexAIService = Depends(get_vertex_ai_service)
):
    """Batch job analysis for multiple positions."""
    if len(requests) > 20:  # Limit batch size for enterprise use
        raise HTTPException(status_code=400, detail="Batch size limited to 20 analyses")

    async def process_request(req: JobAnalysisRequest):
        try:
            return await analyze_job_fit(req, cache_service, vertex_service)
        except HTTPException as e:
            # Re-raise HTTP exceptions to be handled by FastAPI
            raise e
        except Exception as e:
            logger.error("Batch analysis for one request failed", error=str(e), user_id=req.user_id)
            # Return a custom error structure for failed items, but this endpoint is
            # defined to return List[JobAnalysisResponse], so we can't mix types.
            # A more advanced implementation might use a different response model for batches.
            # For now, we'll let it fail the whole batch or skip failed items.
            return None

    # This part needs to be adjusted based on how we want to handle partial failures.
    # For simplicity, we will process them and let individual ones fail if needed.
    # A robust implementation would use asyncio.gather with return_exceptions=True
    results = [await process_request(req) for req in requests]
    
    # Filter out None results from failed analyses
    successful_results = [res for res in results if res is not None]

    return successful_results