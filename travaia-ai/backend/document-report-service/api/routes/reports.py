"""
Report Routes - AI report management endpoints
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog
from services.report_service import ReportService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
report_service = ReportService()

# Pydantic models
class ReportCreateRequest(BaseModel):
    user_id: str
    report_type: str
    title: str
    content: str
    metadata: Optional[Dict[str, Any]] = {}
    references: Optional[Dict[str, Any]] = {}

class ReportUpdateRequest(BaseModel):
    references: Dict[str, Any]

@router.post("/")
async def create_report(request: ReportCreateRequest):
    """Create new AI report"""
    try:
        report = await report_service.create_report(request.dict())
        return {
            "success": True,
            "report": report,
            "message": "Report created successfully"
        }
    except Exception as e:
        logger.error("Report creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{report_id}")
async def get_report(report_id: str, user_id: str):
    """Get report by ID"""
    try:
        report = await report_service.get_report(report_id, user_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "success": True,
            "report": report
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Report retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve report")

@router.get("/user/{user_id}")
async def get_user_reports(
    user_id: str,
    report_type: Optional[str] = None,
    limit: int = 50
):
    """Get all reports for a user"""
    try:
        reports = await report_service.get_user_reports(
            user_id=user_id,
            report_type=report_type,
            limit=limit
        )
        
        return {
            "success": True,
            "reports": reports,
            "count": len(reports)
        }
    except Exception as e:
        logger.error("Reports retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")

@router.put("/{report_id}/references")
async def update_report_references(
    report_id: str,
    request: ReportUpdateRequest,
    user_id: str
):
    """Update report cross-references"""
    try:
        success = await report_service.update_report_references(
            report_id, user_id, request.references
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found or unauthorized")
        
        return {
            "success": True,
            "message": "Report references updated"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Report references update failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to update references")

@router.get("/user/{user_id}/by-reference")
async def get_reports_by_reference(
    user_id: str,
    reference_type: str,
    reference_id: str
):
    """Get reports that reference a specific entity"""
    try:
        reports = await report_service.get_reports_by_reference(
            user_id, reference_type, reference_id
        )
        
        return {
            "success": True,
            "reports": reports,
            "count": len(reports)
        }
    except Exception as e:
        logger.error("Reports by reference retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")