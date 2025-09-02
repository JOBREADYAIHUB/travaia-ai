"""
PDF Routes - PDF generation endpoints
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
import structlog
from services.pdf_service import PDFService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
pdf_service = PDFService()

# Pydantic models
class InterviewReportRequest(BaseModel):
    candidate_name: str
    position: str
    interview_date: Optional[str] = None
    duration_minutes: Optional[int] = 0
    overall_score: Optional[int] = None
    feedback: Optional[str] = ""
    recommendations: Optional[list] = []

class JobAnalysisRequest(BaseModel):
    job_title: str
    company_name: str
    match_score: Optional[int] = 0
    analysis: Optional[str] = ""
    skills_match: Optional[Dict[str, int]] = {}

@router.post("/interview-report")
async def generate_interview_report_pdf(request: InterviewReportRequest):
    """Generate interview feedback report PDF"""
    try:
        pdf_bytes = await pdf_service.generate_interview_report_pdf(request.dict())
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=interview_report_{request.candidate_name.replace(' ', '_')}.pdf"
            }
        )
    except Exception as e:
        logger.error("Interview report PDF generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/job-analysis")
async def generate_job_analysis_pdf(request: JobAnalysisRequest):
    """Generate job fit analysis report PDF"""
    try:
        pdf_bytes = await pdf_service.generate_job_analysis_pdf(request.dict())
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=job_analysis_{request.job_title.replace(' ', '_')}.pdf"
            }
        )
    except Exception as e:
        logger.error("Job analysis PDF generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/custom")
async def generate_custom_pdf(template_data: Dict[str, Any]):
    """Generate custom PDF from template data"""
    try:
        pdf_bytes = await pdf_service.generate_custom_pdf(template_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=custom_report.pdf"
            }
        )
    except Exception as e:
        logger.error("Custom PDF generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))