"""
Resume Upload API Routes
Handles file uploads (PDF, DOCX) and parsing
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio
import magic
from slowapi import Limiter
from slowapi.util import get_remote_address

from shared.auth import verify_firebase_token, get_current_user
from shared.database_pool import get_firestore_client
from shared.circuit_breaker import circuit_breaker
from services.file_processor import FileProcessor
from services.document_parser import DocumentParser

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class UploadResponse(BaseModel):
    resumeId: str
    status: str
    message: str
    parsedData: Optional[Dict[str, Any]] = None
    fileName: str
    fileSize: int
    fileType: str

class ParsedResumeData(BaseModel):
    personalInfo: Dict[str, Any]
    summary: Optional[str] = None
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    skills: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    rawText: str
    confidence: float

# Allowed file types and sizes
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
}

@router.post("/upload", response_model=UploadResponse)
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def upload_resume_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse resume file (PDF, DOCX)
    """
    try:
        user_id = current_user["uid"]
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        file_ext = '.' + file.filename.split('.')[-1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Validate MIME type
        mime_type = magic.from_buffer(file_content, mime=True)
        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type detected: {mime_type}"
            )
        
        # Initialize services
        file_processor = FileProcessor()
        document_parser = DocumentParser()
        
        # Generate resume ID
        resume_id = await file_processor.generate_resume_id(user_id)
        
        # Store file in Firebase Storage
        file_url = await file_processor.store_file(
            file_content=file_content,
            filename=file.filename,
            resume_id=resume_id,
            user_id=user_id
        )
        
        # Parse document content
        parsed_data = await document_parser.parse_document(
            file_content=file_content,
            file_type=file_ext,
            filename=file.filename
        )
        
        # Store parsed data in Firestore
        db = get_firestore_client()
        resume_doc = {
            "userId": user_id,
            "resumeId": resume_id,
            "status": "uploaded",
            "fileName": file.filename,
            "fileSize": file_size,
            "fileType": file_ext,
            "mimeType": mime_type,
            "fileUrl": file_url,
            "parsedData": parsed_data.dict() if parsed_data else None,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await db.collection("resumes").document(resume_id).set(resume_doc)
        
        # Trigger deconstruction service via Pub/Sub
        await file_processor.trigger_deconstruction(resume_id, user_id)
        
        return UploadResponse(
            resumeId=resume_id,
            status="uploaded",
            message="Resume file successfully uploaded and parsed",
            parsedData=parsed_data.dict() if parsed_data else None,
            fileName=file.filename,
            fileSize=file_size,
            fileType=file_ext
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during file upload: {str(e)}"
        )

@router.get("/upload/{resume_id}/status")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_upload_status(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get status of uploaded resume file
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "resumeId": resume_id,
            "status": resume_data.get("status", "unknown"),
            "fileName": resume_data.get("fileName"),
            "fileSize": resume_data.get("fileSize"),
            "fileType": resume_data.get("fileType"),
            "createdAt": resume_data.get("createdAt"),
            "updatedAt": resume_data.get("updatedAt"),
            "parsedData": resume_data.get("parsedData")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving upload status: {str(e)}"
        )

@router.delete("/upload/{resume_id}")
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def delete_uploaded_resume(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete uploaded resume file and data
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume exists and user owns it
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize file processor
        file_processor = FileProcessor()
        
        # Delete file from Firebase Storage
        if resume_data.get("fileUrl"):
            await file_processor.delete_file(resume_data["fileUrl"])
        
        # Delete document from Firestore
        await db.collection("resumes").document(resume_id).delete()
        
        return {
            "resumeId": resume_id,
            "status": "deleted",
            "message": "Resume file and data successfully deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting resume: {str(e)}"
        )

@router.post("/upload/{resume_id}/reparse")
@limiter.limit("3/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def reparse_resume_file(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Re-parse an uploaded resume file with updated algorithms
    """
    try:
        user_id = current_user["uid"]
        
        # Get resume from Firestore
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(resume_id).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        
        # Verify ownership
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if file exists
        if not resume_data.get("fileUrl"):
            raise HTTPException(status_code=400, detail="No file to reparse")
        
        # Initialize services
        file_processor = FileProcessor()
        document_parser = DocumentParser()
        
        # Download file content
        file_content = await file_processor.download_file(resume_data["fileUrl"])
        
        # Re-parse document
        parsed_data = await document_parser.parse_document(
            file_content=file_content,
            file_type=resume_data["fileType"],
            filename=resume_data["fileName"]
        )
        
        # Update Firestore document
        await db.collection("resumes").document(resume_id).update({
            "parsedData": parsed_data.dict() if parsed_data else None,
            "updatedAt": datetime.now().isoformat(),
            "status": "reparsed"
        })
        
        return {
            "resumeId": resume_id,
            "status": "reparsed",
            "message": "Resume file successfully re-parsed",
            "parsedData": parsed_data.dict() if parsed_data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error re-parsing resume: {str(e)}"
        )
