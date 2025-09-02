"""
Resume Templates API Routes
Template management, customization, and application
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
from services.template_manager import TemplateManager
from services.template_customizer import TemplateCustomizer

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Pydantic Models
class Template(BaseModel):
    id: str
    name: str
    category: str
    description: str
    previewUrl: str
    thumbnailUrl: str
    features: List[str]
    compatibility: Dict[str, Any]
    customizable: bool
    premium: bool

class TemplateCustomization(BaseModel):
    templateId: str
    customizations: Dict[str, Any]
    colorScheme: Optional[str] = None
    fontFamily: Optional[str] = None
    layout: Optional[str] = None
    sections: Optional[List[str]] = None

class ApplyTemplateRequest(BaseModel):
    resumeId: str
    templateId: str
    customizations: Optional[Dict[str, Any]] = None

class TemplateResponse(BaseModel):
    success: bool
    template: Optional[Template] = None
    templates: Optional[List[Template]] = None
    message: str
    timestamp: str

@router.get("/", response_model=TemplateResponse)
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_templates(
    request: Request,
    category: Optional[str] = None,
    premium: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get available resume templates
    """
    try:
        # Initialize template manager
        template_manager = TemplateManager()
        
        # Get templates based on filters
        templates = await template_manager.get_templates(
            category=category,
            premium=premium
        )
        
        return TemplateResponse(
            success=True,
            templates=templates,
            message=f"Retrieved {len(templates)} templates",
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving templates: {str(e)}"
        )

@router.get("/{template_id}", response_model=TemplateResponse)
@limiter.limit("60/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_template(
    request: Request,
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get specific template details
    """
    try:
        # Initialize template manager
        template_manager = TemplateManager()
        
        # Get template
        template = await template_manager.get_template(template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return TemplateResponse(
            success=True,
            template=template,
            message="Template retrieved successfully",
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving template: {str(e)}"
        )

@router.post("/apply", response_model=Dict[str, Any])
@limiter.limit("10/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def apply_template(
    request: Request,
    apply_request: ApplyTemplateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Apply template to resume
    """
    try:
        user_id = current_user["uid"]
        
        # Verify resume ownership
        db = get_firestore_client()
        resume_doc = await db.collection("resumes").document(apply_request.resumeId).get()
        
        if not resume_doc.exists:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        resume_data = resume_doc.to_dict()
        if resume_data.get("userId") != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize services
        template_manager = TemplateManager()
        template_customizer = TemplateCustomizer()
        
        # Get template
        template = await template_manager.get_template(apply_request.templateId)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Apply template with customizations
        applied_result = await template_customizer.apply_template(
            resume_data=resume_data,
            template=template,
            customizations=apply_request.customizations
        )
        
        # Update resume with template information
        await db.collection("resumes").document(apply_request.resumeId).update({
            "appliedTemplate": {
                "templateId": apply_request.templateId,
                "templateName": template.name,
                "customizations": apply_request.customizations,
                "appliedAt": datetime.now().isoformat()
            },
            "generatedContent": applied_result.get("content"),
            "styling": applied_result.get("styling"),
            "updatedAt": datetime.now().isoformat()
        })
        
        return {
            "success": True,
            "resumeId": apply_request.resumeId,
            "templateId": apply_request.templateId,
            "result": applied_result,
            "message": "Template applied successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error applying template: {str(e)}"
        )

@router.post("/customize")
@limiter.limit("15/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def customize_template(
    request: Request,
    customization: TemplateCustomization,
    current_user: dict = Depends(get_current_user)
):
    """
    Customize template appearance and layout
    """
    try:
        # Initialize template customizer
        template_customizer = TemplateCustomizer()
        
        # Get template
        template_manager = TemplateManager()
        template = await template_manager.get_template(customization.templateId)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Apply customizations
        customized_template = await template_customizer.customize_template(
            template=template,
            customizations=customization.customizations,
            color_scheme=customization.colorScheme,
            font_family=customization.fontFamily,
            layout=customization.layout,
            sections=customization.sections
        )
        
        return {
            "success": True,
            "templateId": customization.templateId,
            "customizedTemplate": customized_template,
            "message": "Template customized successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error customizing template: {str(e)}"
        )

@router.get("/preview/{template_id}")
@limiter.limit("20/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def preview_template(
    request: Request,
    template_id: str,
    resume_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate template preview with optional resume data
    """
    try:
        user_id = current_user["uid"]
        
        # Initialize services
        template_manager = TemplateManager()
        template_customizer = TemplateCustomizer()
        
        # Get template
        template = await template_manager.get_template(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get resume data if provided
        resume_data = None
        if resume_id:
            db = get_firestore_client()
            resume_doc = await db.collection("resumes").document(resume_id).get()
            
            if resume_doc.exists:
                resume_data = resume_doc.to_dict()
                # Verify ownership
                if resume_data.get("userId") != user_id:
                    resume_data = None  # Use sample data instead
        
        # Generate preview
        preview_result = await template_customizer.generate_preview(
            template=template,
            resume_data=resume_data
        )
        
        return {
            "success": True,
            "templateId": template_id,
            "preview": preview_result,
            "message": "Preview generated successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating preview: {str(e)}"
        )

@router.get("/categories")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_template_categories(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get available template categories
    """
    try:
        # Initialize template manager
        template_manager = TemplateManager()
        
        # Get categories
        categories = await template_manager.get_categories()
        
        return {
            "success": True,
            "categories": categories,
            "message": f"Retrieved {len(categories)} categories",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving categories: {str(e)}"
        )

@router.post("/save-custom")
@limiter.limit("5/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def save_custom_template(
    request: Request,
    template_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """
    Save custom template for user
    """
    try:
        user_id = current_user["uid"]
        
        # Initialize template manager
        template_manager = TemplateManager()
        
        # Save custom template
        custom_template = await template_manager.save_custom_template(
            user_id=user_id,
            template_data=template_data
        )
        
        return {
            "success": True,
            "customTemplate": custom_template,
            "message": "Custom template saved successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error saving custom template: {str(e)}"
        )

@router.get("/user/custom")
@limiter.limit("30/minute")
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
async def get_user_custom_templates(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's custom templates
    """
    try:
        user_id = current_user["uid"]
        
        # Get custom templates from Firestore
        db = get_firestore_client()
        custom_templates = []
        
        custom_docs = await db.collection("custom_templates")\
            .where("userId", "==", user_id)\
            .order_by("createdAt", direction="desc")\
            .get()
        
        for doc in custom_docs:
            template_data = doc.to_dict()
            custom_templates.append({
                "id": doc.id,
                **template_data
            })
        
        return {
            "success": True,
            "customTemplates": custom_templates,
            "message": f"Retrieved {len(custom_templates)} custom templates",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving custom templates: {str(e)}"
        )
