"""
Pipecat Routes - AI voice interview pipeline management
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List
import structlog

from services.pipecat_service import PipecatService
from models.dto import (
    PipelineCreateRequest,
    PipelineStartRequest,
    PipelineStopRequest,
    QuestionRequest,
)
from models.domain import (
    Pipeline,
    PipelineResponse,
    PipelineStatusResponse,
    QuestionResponse,
    TranscriptResponse,
    PersonaListResponse,
    VoiceConfigListResponse,
    GenericSuccessResponse,
    InterviewerPersona,
    VoiceConfiguration,
    Transcript,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
pipecat_service = PipecatService()

@router.post("/pipeline", response_model=PipelineResponse)
async def create_pipeline(request: PipelineCreateRequest):
    """Create new Pipecat AI interview pipeline"""
    try:
        pipeline_data = await pipecat_service.create_pipeline(
            session_id=request.session_id,
            user_id=request.user_id,
            interview_type=request.interview_type,
            language=request.language,
            interviewer_persona=request.interviewer_persona,
            voice_config=request.voice_config,
            ai_config=request.ai_config
        )
        
        return PipelineResponse(
            success=True,
            pipeline=Pipeline(**pipeline_data),
            message="AI interview pipeline created successfully"
        )
    except Exception as e:
        logger.error("Pipeline creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline/{pipeline_id}/start", response_model=PipelineStatusResponse)
async def start_pipeline(pipeline_id: str, request: PipelineStartRequest):
    """Start AI interview pipeline"""
    try:
        result = await pipecat_service.start_pipeline(
            pipeline_id=pipeline_id,
            user_id=request.user_id,
            room_url=request.room_url
        )
        
        return PipelineStatusResponse(
            success=True,
            status=result
        )
    except Exception as e:
        logger.error("Pipeline start failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline/{pipeline_id}/stop", response_model=GenericSuccessResponse)
async def stop_pipeline(pipeline_id: str, request: PipelineStopRequest):
    """Stop AI interview pipeline"""
    try:
        success = await pipecat_service.stop_pipeline(
            pipeline_id=pipeline_id,
            user_id=request.user_id,
            reason=request.reason
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Pipeline not found or unauthorized")
        
        return GenericSuccessResponse(
            success=True,
            message="AI interview pipeline stopped successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pipeline stop failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipeline/{pipeline_id}/status", response_model=PipelineStatusResponse)
async def get_pipeline_status(pipeline_id: str, user_id: str):
    """Get AI interview pipeline status"""
    try:
        status = await pipecat_service.get_pipeline_status(pipeline_id, user_id)
        if not status:
            raise HTTPException(status_code=404, detail="Pipeline not found")
        
        return PipelineStatusResponse(
            success=True,
            status=status
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Pipeline status retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve pipeline status")

@router.post("/pipeline/{pipeline_id}/question", response_model=QuestionResponse)
async def generate_question(pipeline_id: str, request: QuestionRequest):
    """Generate next interview question using AI"""
    try:
        question = await pipecat_service.generate_question(
            pipeline_id=pipeline_id,
            user_id=request.user_id,
            question_type=request.question_type,
            context=request.context
        )
        
        return QuestionResponse(
            success=True,
            question=question,
            message="Question generated successfully"
        )
    except Exception as e:
        logger.error("Question generation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipeline/{pipeline_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(pipeline_id: str, user_id: str):
    """Get interview transcript"""
    try:
        transcript_data = await pipecat_service.get_transcript(pipeline_id, user_id)
        if not transcript_data:
            raise HTTPException(status_code=404, detail="Transcript not found")
        
        return TranscriptResponse(
            success=True,
            transcript=Transcript(**transcript_data)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transcript retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve transcript")

@router.get("/personas", response_model=PersonaListResponse)
async def get_interviewer_personas():
    """Get available interviewer personas"""
    try:
        personas_data = await pipecat_service.get_available_personas()
        personas = [InterviewerPersona(**p) for p in personas_data]
        return PersonaListResponse(
            success=True,
            personas=personas
        )
    except Exception as e:
        logger.error("Personas retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve personas")

@router.get("/voice-configs", response_model=VoiceConfigListResponse)
async def get_voice_configs():
    """Get available voice configurations"""
    try:
        configs_data = await pipecat_service.get_voice_configs()
        configs = [VoiceConfiguration(**c) for c in configs_data]
        return VoiceConfigListResponse(
            success=True,
            voice_configs=configs
        )
    except Exception as e:
        logger.error("Voice configs retrieval failed", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve voice configurations")