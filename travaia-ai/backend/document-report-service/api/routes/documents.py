"""
Document Routes - File management endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import structlog
from services.document_service import DocumentService

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
doc_service = DocumentService()

# Pydantic models
class DocumentResponse(BaseModel):
    document_id: str
    user_id: str
    filename: str
    document_type: str
    download_url: str
    file_size: int
    upload_date: str

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    document_type: str = Form(default="misc")
):
    """Upload document to Firebase Storage"""
    try:
        # Read file data
        file_data = await file.read()
        
        # Upload document
        document = await doc_service.upload_document(
            user_id=user_id,
            file_data=file_data,
            filename=file.filename,
            document_type=document_type
        )
        
        return {
            "success": True,
            "document": document,
            "message": "Document uploaded successfully"
        }
    except Exception as e:
        logger.error("Document upload failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}")
async def get_document(document_id: str, user_id: str):
    """Get document metadata by ID"""
    try:
        document = await doc_service.get_document(document_id, user_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "success": True,
            "document": document
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Document retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve document")

@router.get("/user/{user_id}")
async def get_user_documents(
    user_id: str,
    document_type: Optional[str] = None,
    limit: int = 50
):
    """Get all documents for a user"""
    try:
        documents = await doc_service.get_user_documents(
            user_id=user_id,
            document_type=document_type,
            limit=limit
        )
        
        return {
            "success": True,
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        logger.error("Documents retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")

@router.delete("/{document_id}")
async def delete_document(document_id: str, user_id: str):
    """Delete document"""
    try:
        success = await doc_service.delete_document(document_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or unauthorized")
        
        return {
            "success": True,
            "message": "Document deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Document deletion failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to delete document")

@router.get("/user/{user_id}/storage")
async def get_storage_usage(user_id: str):
    """Get user's storage usage statistics"""
    try:
        usage = await doc_service.get_storage_usage(user_id)
        return {
            "success": True,
            "storage_usage": usage
        }
    except Exception as e:
        logger.error("Storage usage retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get storage usage")