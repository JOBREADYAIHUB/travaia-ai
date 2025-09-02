"""
Resume Generation API Routes
Document generation and assembly from templates and data
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
from services.document_generator import DocumentGenerator
from services.content_assembler import ContentAssembler

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class GenerationRequest(BaseModel):
    resumeId: str
    format: str = "pdf"  # pdf, docx, html
    templateId: Optional[str] = None
    customizations: Optional[Dict[str, Any]] = None
    sections: Optional[List[str]] = None
    quality: str = "high"  # high, medium, fast

class GenerationResult(BaseModel):
    resumeId: str
    generationId: str
    format: str
    fileUrl: str
    fileName: str
    fileSize: int
    generatedAt: str
    templateUsed: Optional[str] = None
    processingTime: float

class GenerationResponse(BaseModel):
    success: bool
    result: Optional[GenerationResult] = None
    message: str
    timestamp: str

class BatchGenerationRequest(BaseModel):
    resumeId: str
    formats: List[str]  # ["pdf", "docx", "html"]
    templateId: Optional[str] = None
    customizations: Optional[Dict[str, Any]] = None

@router.post("/generate", response_model=GenerationResponse)
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def generate_resume(
    request: Request,
    generation_request: GenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate resume document in specified format
    """
    try:
        user_id = current_user["uid"]
        start_time = datetime.now()
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(generation_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize services
        document_generator = DocumentGenerator()
        content_assembler = ContentAssembler()
        
        # Assemble content with template
        assembled_content = await content_assembler.assemble_content(
            resume_data=resume_data,
            template_id=generation_request.templateId,
            customizations=generation_request.customizations,
            sections=generation_request.sections
        )
        
        # Generate document
        generation_result = await document_generator.generate_document(
            content=assembled_content,
            format=generation_request.format,
            quality=generation_request.quality,
            user_id=user_id,
            resume_id=generation_request.resumeId
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create generation record
        generation_id = f"gen_{generation_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        generation_doc = {
            "generationId": generation_id,
            "resumeId": generation_request.resumeId,
            "userId": user_id,
            "format": generation_request.format,
            "templateId": generation_request.templateId,
            "customizations": generation_request.customizations,
            "fileUrl": generation_result["file_url"],
            "fileName": generation_result["file_name"],
            "fileSize": generation_result["file_size"],
            "processingTime": processing_time,
            "quality": generation_request.quality,
            "createdAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await db.collection("resume_generations").document(generation_id).set(generation_doc)
        
        # Update resume with latest generation
        await db.collection("resumes").document(generation_request.resumeId).update({
            "lastGeneration": {
                "id": generation_id,
                "format": generation_request.format,
                "fileUrl": generation_result["file_url"],
                "timestamp": datetime.now().isoformat()
            },
            "updatedAt": datetime.now().isoformat()
        })
        
        result = GenerationResult(
            resumeId=generation_request.resumeId,
            generationId=generation_id,
            format=generation_request.format,
            fileUrl=generation_result["file_url"],
            fileName=generation_result["file_name"],
            fileSize=generation_result["file_size"],
            generatedAt=datetime.now().isoformat(),
            templateUsed=generation_request.templateId,
            processingTime=processing_time
        )
        
        return GenerationResponse(
            success=True,
            result=result,
            message="Resume generated successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(e)}"
        )

@router.post("/generate/batch")
@limiter.limit("3/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def generate_batch(
    request: Request,
    batch_request: BatchGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate resume in multiple formats simultaneously
    """
    try:
        user_id = current_user["uid"]
        
        if len(batch_request.formats) > 3:
            raise HTTPException(
                status_code=400,
                detail="Maximum 3 formats allowed in batch generation"
            )
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(batch_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize services
        document_generator = DocumentGenerator()
        content_assembler = ContentAssembler()
        
        # Assemble content once for all formats
        assembled_content = await content_assembler.assemble_content(
            resume_data=resume_data,
            template_id=batch_request.templateId,
            customizations=batch_request.customizations
        )
        
        # Generate documents in parallel
        generation_tasks = []
        for format_type in batch_request.formats:
            task = document_generator.generate_document(
                content=assembled_content,
                format=format_type,
                quality="high",
                user_id=user_id,
                resume_id=batch_request.resumeId
            )
            generation_tasks.append(task)
        
        generation_results = await asyncio.gather(*generation_tasks, return_exceptions=True)
        
        # Process results
        batch_results = []
        batch_id = f"batch_{batch_request.resumeId}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        for i, result in enumerate(generation_results):
            format_type = batch_request.formats[i]
            
            if isinstance(result, Exception):
                batch_results.append({
                    "format": format_type,
                    "success": False,
                    "error": str(result)
                })
            else:
                generation_id = f"{batch_id}_{format_type}"
                
                # Store generation record
                generation_doc = {
                    "generationId": generation_id,
                    "batchId": batch_id,
                    "resumeId": batch_request.resumeId,
                    "userId": user_id,
                    "format": format_type,
                    "templateId": batch_request.templateId,
                    "fileUrl": result["file_url"],
                    "fileName": result["file_name"],
                    "fileSize": result["file_size"],
                    "createdAt": datetime.now().isoformat(),
                    "version": "1.0"
                }
                
                await db.collection("resume_generations").document(generation_id).set(generation_doc)
                
                batch_results.append({
                    "format": format_type,
                    "success": True,
                    "generationId": generation_id,
                    "fileUrl": result["file_url"],
                    "fileName": result["file_name"],
                    "fileSize": result["file_size"]
                })
        
        return {
            "success": True,
            "batchId": batch_id,
            "resumeId": batch_request.resumeId,
            "results": batch_results,
            "message": f"Batch generation completed for {len(batch_request.formats)} formats",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch generation failed: {str(e)}"
        )

@router.get("/status/{generation_id}")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_generation_status(
    request: Request,
    generation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get generation status and details
    """
    try:
        user_id = current_user["uid"]
        
        # Get generation document
        db = get_firestore_client()
        generation_doc = await db.collection("resume_generations").document(generation_id).get()
        
        if not generation_doc.exists:
            raise HTTPException(status_code=404, detail="Generation not found")
        
        generation_data = generation_doc.to_dict()
        
        # Verify ownership
        if generation_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {
            "generationId": generation_id,
            "status": "completed",  # In this implementation, all stored generations are completed
            "resumeId": generation_data.get("resumeId"),
            "format": generation_data.get("format"),
            "fileUrl": generation_data.get("fileUrl"),
            "fileName": generation_data.get("fileName"),
            "fileSize": generation_data.get("fileSize"),
            "processingTime": generation_data.get("processingTime"),
            "createdAt": generation_data.get("createdAt"),
            "templateUsed": generation_data.get("templateId")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving generation status: {str(e)}"
        )

@router.get("/history/{resume_id}")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_generation_history(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get generation history for a resume
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
        
        # Get generation history
        generations = []
        generation_docs = await db.collection("resume_generations")\
            .where("resumeId", "==", resume_id)\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .limit(20).get()
        
        for doc in generation_docs:
            generation_data = doc.to_dict()
            generations.append({
                "id": doc.id,
                "format": generation_data.get("format"),
                "fileName": generation_data.get("fileName"),
                "fileSize": generation_data.get("fileSize"),
                "fileUrl": generation_data.get("fileUrl"),
                "templateId": generation_data.get("templateId"),
                "processingTime": generation_data.get("processingTime"),
                "createdAt": generation_data.get("createdAt"),
                "batchId": generation_data.get("batchId")
            })
        
        return {
            "resumeId": resume_id,
            "generations": generations,
            "totalCount": len(generations)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving generation history: {str(e)}"
        )

@router.post("/regenerate/{generation_id}")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def regenerate_document(
    request: Request,
    generation_id: str,
    customizations: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Regenerate document with updated customizations
    """
    try:
        user_id = current_user["uid"]
        
        # Get original generation
        db = get_firestore_client()
        generation_doc = await db.collection("resume_generations").document(generation_id).get()
        
        if not generation_doc.exists:
            raise HTTPException(status_code=404, detail="Generation not found")
        
        generation_data = generation_doc.to_dict()
        
        # Verify ownership
        if generation_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create new generation request based on original
        new_request = GenerationRequest(
            resumeId=generation_data["resumeId"],
            format=generation_data["format"],
            templateId=generation_data.get("templateId"),
            customizations=customizations or generation_data.get("customizations"),
            quality="high"
        )
        
        # Generate new document
        return await generate_resume(request, new_request, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Regeneration failed: {str(e)}"
        )

@router.delete("/delete/{generation_id}")
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def delete_generation(
    request: Request,
    generation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete generated document and record
    """
    try:
        user_id = current_user["uid"]
        
        # Get generation document
        db = get_firestore_client()
        generation_doc = await db.collection("resume_generations").document(generation_id).get()
        
        if not generation_doc.exists:
            raise HTTPException(status_code=404, detail="Generation not found")
        
        generation_data = generation_doc.to_dict()
        
        # Verify ownership
        if generation_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize document generator for file deletion
        document_generator = DocumentGenerator()
        
        # Delete file from storage
        file_url = generation_data.get("fileUrl")
        if file_url:
            await document_generator.delete_generated_file(file_url)
        
        # Delete generation record
        await db.collection("resume_generations").document(generation_id).delete()
        
        return {
            "success": True,
            "generationId": generation_id,
            "message": "Generation deleted successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting generation: {str(e)}"
        )
