"""
Resume Export API Routes
Document export, sharing, and delivery management
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import io
from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.auth import verify_firebase_token, get_current_user
from shared.database_pool import get_firestore_client
from shared.circuit_breaker import circuit_breaker
from services.export_manager import ExportManager
from services.sharing_service import SharingService

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class ExportRequest(BaseModel):
    resumeId: str
    format: str = "pdf"  # pdf, docx, html, txt
    delivery: str = "download"  # download, email, share_link
    options: Optional[Dict[str, Any]] = None

class ShareRequest(BaseModel):
    resumeId: str
    shareType: str = "public"  # public, private, password
    expiresIn: Optional[int] = 7  # days
    password: Optional[str] = None
    allowDownload: bool = True

class EmailExportRequest(BaseModel):
    resumeId: str
    format: str = "pdf"
    recipientEmail: str
    subject: Optional[str] = None
    message: Optional[str] = None

class ExportResult(BaseModel):
    exportId: str
    resumeId: str
    format: str
    delivery: str
    fileUrl: Optional[str] = None
    shareUrl: Optional[str] = None
    downloadUrl: Optional[str] = None
    expiresAt: Optional[str] = None

class ExportResponse(BaseModel):
    success: bool
    result: Optional[ExportResult] = None
    message: str
    timestamp: str

@router.post("/export", response_model=ExportResponse)
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def export_resume(
    request: Request,
    export_request: ExportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Export resume in specified format and delivery method
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(export_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize export manager
        export_manager = ExportManager()
        
        # Perform export based on delivery method
        if export_request.delivery == "download":
            export_result = await export_manager.prepare_download(
                resume_data=resume_data,
                format=export_request.format,
                options=export_request.options
            )
        elif export_request.delivery == "email":
            export_result = await export_manager.send_email(
                resume_data=resume_data,
                format=export_request.format,
                user_email=current_user.get("email"),
                options=export_request.options
            )
        elif export_request.delivery == "share_link":
            export_result = await export_manager.create_share_link(
                resume_data=resume_data,
                format=export_request.format,
                user_id=user_id,
                options=export_request.options
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid delivery method")
        
        # Create export record
        export_id = f"export_{export_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        export_doc = {
            "exportId": export_id,
            "resumeId": export_request.resumeId,
            "userId": user_id,
            "format": export_request.format,
            "delivery": export_request.delivery,
            "options": export_request.options,
            "result": export_result,
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await db.collection("resume_exports").document(export_id).set(export_doc)
        
        result = ExportResult(
            exportId=export_id,
            resumeId=export_request.resumeId,
            format=export_request.format,
            delivery=export_request.delivery,
            **export_result
        )
        
        return ExportResponse(
            success=True,
            result=result,
            message="Resume exported successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Export failed: {str(e)}"
        )

@router.get("/download/{export_id}")
@limiter.limit("20/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def download_export(
    request: Request,
    export_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download exported resume file
    """
    try:
        user_id = current_user["uid"]
        
        # Get export record
        db = get_firestore_client()
        export_doc = await db.collection("resume_exports").document(export_id).get()
        
        if not export_doc.exists:
            raise HTTPException(status_code=404, detail="Export not found")
        
        export_data = export_doc.to_dict()
        
        # Verify ownership
        if export_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize export manager
        export_manager = ExportManager()
        
        # Get file content and metadata
        file_content, content_type, filename = await export_manager.get_export_file(
            export_data.get("result", {}).get("fileUrl")
        )
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Download failed: {str(e)}"
        )

@router.post("/share")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def create_share_link(
    request: Request,
    share_request: ShareRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create shareable link for resume
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(share_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize sharing service
        sharing_service = SharingService()
        
        # Create share link
        share_result = await sharing_service.create_share_link(
            resume_data=resume_data,
            share_type=share_request.shareType,
            expires_in_days=share_request.expiresIn,
            password=share_request.password,
            allow_download=share_request.allowDownload,
            user_id=user_id
        )
        
        return {
            "success": True,
            "resumeId": share_request.resumeId,
            "shareId": share_result["share_id"],
            "shareUrl": share_result["share_url"],
            "shareType": share_request.shareType,
            "expiresAt": share_result["expires_at"],
            "allowDownload": share_request.allowDownload,
            "message": "Share link created successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Share link creation failed: {str(e)}"
        )

@router.post("/email")
@limiter.limit("3/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def email_resume(
    request: Request,
    email_request: EmailExportRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Email resume to specified recipient
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(email_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize export manager
        export_manager = ExportManager()
        
        # Send email with resume
        email_result = await export_manager.send_resume_email(
            resume_data=resume_data,
            format=email_request.format,
            recipient_email=email_request.recipientEmail,
            sender_email=current_user.get("email"),
            subject=email_request.subject,
            message=email_request.message
        )
        
        # Create email export record
        email_export_id = f"email_{email_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        email_doc = {
            "exportId": email_export_id,
            "resumeId": email_request.resumeId,
            "userId": user_id,
            "format": email_request.format,
            "delivery": "email",
            "recipientEmail": email_request.recipientEmail,
            "subject": email_request.subject,
            "message": email_request.message,
            "result": email_result,
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await db.collection("resume_exports").document(email_export_id).set(email_doc)
        
        return {
            "success": True,
            "exportId": email_export_id,
            "resumeId": email_request.resumeId,
            "recipientEmail": email_request.recipientEmail,
            "format": email_request.format,
            "message": "Resume emailed successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Email export failed: {str(e)}"
        )

@router.get("/shared/{share_id}")
@limiter.limit("50/minute")
async def view_shared_resume(
    request: Request,
    share_id: str,
    password: Optional[str] = None
):
    """
    View shared resume (public endpoint)
    """
    try:
        # Initialize sharing service
        sharing_service = SharingService()
        
        # Get shared resume
        shared_resume = await sharing_service.get_shared_resume(
            share_id=share_id,
            password=password
        )
        
        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found or expired")
        
        return {
            "success": True,
            "shareId": share_id,
            "resume": shared_resume["resume_data"],
            "shareInfo": {
                "shareType": shared_resume["share_type"],
                "allowDownload": shared_resume["allow_download"],
                "expiresAt": shared_resume["expires_at"]
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error viewing shared resume: {str(e)}"
        )

@router.get("/shared/{share_id}/download")
@limiter.limit("20/minute")
async def download_shared_resume(
    request: Request,
    share_id: str,
    format: str = "pdf",
    password: Optional[str] = None
):
    """
    Download shared resume (public endpoint)
    """
    try:
        # Initialize sharing service
        sharing_service = SharingService()
        
        # Check if download is allowed
        share_info = await sharing_service.get_share_info(share_id)
        if not share_info or not share_info.get("allow_download"):
            raise HTTPException(status_code=403, detail="Download not allowed")
        
        # Get shared resume
        shared_resume = await sharing_service.get_shared_resume(
            share_id=share_id,
            password=password
        )
        
        if not shared_resume:
            raise HTTPException(status_code=404, detail="Shared resume not found or expired")
        
        # Generate document for download
        export_manager = ExportManager()
        file_content, content_type, filename = await export_manager.generate_shared_download(
            resume_data=shared_resume["resume_data"],
            format=format
        )
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Shared download failed: {str(e)}"
        )

@router.get("/exports/{resume_id}")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_export_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get export history for a resume
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
        
        # Get export history
        exports = []
        export_docs = await db.collection("resume_exports")\
            .where("resumeId", "==", resume_id)\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .limit(20).get()
        
        for doc in export_docs:
            export_data = doc.to_dict()
            exports.append({
                "id": doc.id,
                "format": export_data.get("format"),
                "delivery": export_data.get("delivery"),
                "createdAt": export_data.get("createdAt"),
                "recipientEmail": export_data.get("recipientEmail"),
                "result": export_data.get("result", {})
            })
        
        return {
            "resumeId": resume_id,
            "exports": exports,
            "totalCount": len(exports)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving export history: {str(e)}"
        )

@router.delete("/share/{share_id}")
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def revoke_share_link(
    request: Request,
    share_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Revoke/delete share link
    """
    try:
        user_id = current_user["uid"]
        
        # Initialize sharing service
        sharing_service = SharingService()
        
        # Revoke share link
        revoke_result = await sharing_service.revoke_share_link(
            share_id=share_id,
            user_id=user_id
        )
        
        if not revoke_result:
            raise HTTPException(status_code=404, detail="Share link not found or access denied")
        
        return {
            "success": True,
            "shareId": share_id,
            "message": "Share link revoked successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error revoking share link: {str(e)}"
        )
