"""
Speech Processing Routes - Enterprise TTS/STT endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import List, Dict, Any, Optional
import structlog

from services.speech_service import SpeechService
from api.dependencies import get_speech_service
from models.dto import (
    TextToSpeechRequest,
    SpeechToTextRequest,
    BatchTextToSpeechRequest,
)
from models.domain import (
    TextToSpeechResponse,
    SpeechToTextResponse,
    BatchTextToSpeechResponse,
    Voice,
    SupportedVoicesResponse,
    SpeechLanguage,
    SupportedSpeechLanguagesResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
speech_service = SpeechService()

@router.post("/text-to-speech", response_model=TextToSpeechResponse)
async def convert_text_to_speech(
    request: TextToSpeechRequest,
    speech_service: SpeechService = Depends(get_speech_service),
):
    """Convert text to high-quality speech"""
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        if len(request.text) > 5000:
            raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
        
        result = await speech_service.text_to_speech(
            text=request.text,
            language_code=request.language_code,
            voice_name=request.voice_name,
            speaking_rate=request.speaking_rate
        )
        
        return TextToSpeechResponse(
            audio_content=result["audio_content"],
            duration_estimate=result["duration_estimate"],
            language_code=result["language_code"],
            voice_name=result["voice_name"],
            cached=result.get("cached", False)
        )
        
    except Exception as e:
        logger.error("TTS conversion failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def convert_speech_to_text(
    request: SpeechToTextRequest,
    speech_service: SpeechService = Depends(get_speech_service),
):
    """Convert speech to text with confidence scoring"""
    try:
        if not request.audio_content:
            raise HTTPException(status_code=400, detail="Audio content required")

        result = await speech_service.speech_to_text(
            audio_content=request.audio_content,
            language_code=request.language_code,
            encoding=request.encoding,
        )
        
        if "error" in result:
            raise HTTPException(status_code=422, detail=result["error"])
        
        return SpeechToTextResponse(
            transcript=result["transcript"],
            confidence=result["confidence"],
            words=result["words"],
            duration=result["duration"],
            language_code=result["language_code"],
            word_count=result["word_count"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("STT conversion failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Speech recognition failed: {str(e)}")

@router.post("/batch-text-to-speech", response_model=BatchTextToSpeechResponse)
async def batch_text_to_speech(
    request: BatchTextToSpeechRequest,
    speech_service: SpeechService = Depends(get_speech_service),
):
    """Batch TTS processing for efficiency"""
    if len(request.requests) > 20:
        raise HTTPException(status_code=400, detail="Batch size limited to 20 requests")

    try:
        batch_items = [
            {
                "text": req.text,
                "language_code": req.language_code,
                "voice_name": req.voice_name,
                "speaking_rate": req.speaking_rate,
            }
            for req in request.requests
        ]

        results = await speech_service.batch_text_to_speech(batch_items)

        return BatchTextToSpeechResponse(
            results=results,
            batch_size=len(request.requests),
            success_count=len([r for r in results if "error" not in r]),
        )

    except Exception as e:
        logger.error("Batch TTS failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

@router.get("/supported-voices", response_model=SupportedVoicesResponse)
async def get_supported_voices(
    language_code: Optional[str] = None,
    speech_service: SpeechService = Depends(get_speech_service),
):
    """Get list of supported voices"""
    try:
        voices_data = await speech_service.get_supported_voices(language_code)
        voices = [Voice(**v) for v in voices_data]
        return SupportedVoicesResponse(
            voices=voices,
            total_count=len(voices),
            language_filter=language_code,
        )
    except Exception as e:
        logger.error("Failed to get voices", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve supported voices")

@router.get("/supported-languages", response_model=SupportedSpeechLanguagesResponse)
async def get_supported_languages():
    """Get list of supported languages for speech processing"""
    languages_data = [
        {"code": "en-US", "name": "English (US)", "tts": True, "stt": True},
        {"code": "en-GB", "name": "English (UK)", "tts": True, "stt": True},
        {"code": "es-ES", "name": "Spanish (Spain)", "tts": True, "stt": True},
        {"code": "fr-FR", "name": "French (France)", "tts": True, "stt": True},
        {"code": "de-DE", "name": "German (Germany)", "tts": True, "stt": True},
        {"code": "it-IT", "name": "Italian (Italy)", "tts": True, "stt": True},
        {"code": "pt-BR", "name": "Portuguese (Brazil)", "tts": True, "stt": True},
        {"code": "ja-JP", "name": "Japanese (Japan)", "tts": True, "stt": True},
        {"code": "ko-KR", "name": "Korean (South Korea)", "tts": True, "stt": True},
        {"code": "zh-CN", "name": "Chinese (Simplified)", "tts": True, "stt": True},
    ]
    languages = [SpeechLanguage(**lang) for lang in languages_data]
    return SupportedSpeechLanguagesResponse(
        languages=languages, total_count=len(languages)
    )