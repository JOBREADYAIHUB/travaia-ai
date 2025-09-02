"""
Analytics Routes - Interview analytics and insights endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog
from services.analytics_service import AnalyticsService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
analytics_service = AnalyticsService()

# Pydantic models
class AnalyticsQuery(BaseModel):
    user_id: str
    date_range: Optional[Dict[str, str]] = {}  # {"start": "2024-01-01", "end": "2024-01-31"}
    session_types: Optional[List[str]] = []
    interview_types: Optional[List[str]] = []
    metrics: Optional[List[str]] = []  # specific metrics to include

class PerformanceAnalysisRequest(BaseModel):
    user_id: str
    session_ids: Optional[List[str]] = []
    analysis_type: Optional[str] = "comprehensive"  # comprehensive, quick, detailed

class ComparisonRequest(BaseModel):
    user_id: str
    baseline_session_id: str
    comparison_session_ids: List[str]

@router.get("/dashboard/{user_id}")
async def get_analytics_dashboard(user_id: str):
    """Get comprehensive analytics dashboard data"""
    try:
        dashboard_data = await analytics_service.get_dashboard_data(user_id)
        return {
            "success": True,
            "dashboard": dashboard_data
        }
    except Exception as e:
        logger.error("Dashboard data retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard data")

@router.post("/query")
async def query_analytics(request: AnalyticsQuery):
    """Query analytics with custom filters"""
    try:
        results = await analytics_service.query_analytics(
            user_id=request.user_id,
            date_range=request.date_range,
            session_types=request.session_types,
            interview_types=request.interview_types,
            metrics=request.metrics
        )
        
        return {
            "success": True,
            "analytics": results
        }
    except Exception as e:
        logger.error("Analytics query failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_session_analytics(session_id: str, user_id: str):
    """Get detailed analytics for specific session"""
    try:
        analytics = await analytics_service.get_session_analytics(session_id, user_id)
        if not analytics:
            raise HTTPException(status_code=404, detail="Session analytics not found")
        
        return {
            "success": True,
            "analytics": analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Session analytics retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve session analytics")

@router.post("/performance-analysis")
async def analyze_performance(request: PerformanceAnalysisRequest):
    """Analyze interview performance with AI insights"""
    try:
        analysis = await analytics_service.analyze_performance(
            user_id=request.user_id,
            session_ids=request.session_ids,
            analysis_type=request.analysis_type
        )
        
        return {
            "success": True,
            "analysis": analysis,
            "message": "Performance analysis completed"
        }
    except Exception as e:
        logger.error("Performance analysis failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trends/{user_id}")
async def get_performance_trends(user_id: str, period: str = "30d"):
    """Get performance trends over time"""
    try:
        trends = await analytics_service.get_performance_trends(user_id, period)
        return {
            "success": True,
            "trends": trends
        }
    except Exception as e:
        logger.error("Performance trends retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve performance trends")

@router.post("/compare")
async def compare_sessions(request: ComparisonRequest):
    """Compare multiple interview sessions"""
    try:
        comparison = await analytics_service.compare_sessions(
            user_id=request.user_id,
            baseline_session_id=request.baseline_session_id,
            comparison_session_ids=request.comparison_session_ids
        )
        
        return {
            "success": True,
            "comparison": comparison
        }
    except Exception as e:
        logger.error("Session comparison failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/insights/{user_id}")
async def get_ai_insights(user_id: str):
    """Get AI-generated insights and recommendations"""
    try:
        insights = await analytics_service.get_ai_insights(user_id)
        return {
            "success": True,
            "insights": insights
        }
    except Exception as e:
        logger.error("AI insights retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve AI insights")

@router.get("/skills-assessment/{user_id}")
async def get_skills_assessment(user_id: str):
    """Get comprehensive skills assessment"""
    try:
        assessment = await analytics_service.get_skills_assessment(user_id)
        return {
            "success": True,
            "assessment": assessment
        }
    except Exception as e:
        logger.error("Skills assessment retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve skills assessment")

@router.get("/benchmarks/{user_id}")
async def get_industry_benchmarks(user_id: str, industry: Optional[str] = None):
    """Get industry benchmarks and comparisons"""
    try:
        benchmarks = await analytics_service.get_industry_benchmarks(user_id, industry)
        return {
            "success": True,
            "benchmarks": benchmarks
        }
    except Exception as e:
        logger.error("Industry benchmarks retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve industry benchmarks")

@router.get("/export/{user_id}")
async def export_analytics(user_id: str, format: str = "json"):
    """Export analytics data in various formats"""
    try:
        if format not in ["json", "csv", "pdf"]:
            raise HTTPException(status_code=400, detail="Invalid export format")
        
        export_data = await analytics_service.export_analytics(user_id, format)
        return {
            "success": True,
            "export_url": export_data.get("url"),
            "format": format,
            "message": "Analytics export ready"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Analytics export failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export analytics")