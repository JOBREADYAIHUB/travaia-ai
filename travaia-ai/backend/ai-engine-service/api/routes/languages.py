"""
Supported Languages Routes - Information about supported languages for AI analysis
"""

from fastapi import APIRouter, HTTPException
import structlog

from services.vertex_ai_service import VertexAIService
from models.domain import Language, SupportedLanguagesResponse, LanguageInfoResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

# Initialize service
vertex_service = VertexAIService()


@router.get("/supported-languages", response_model=SupportedLanguagesResponse)
async def get_supported_languages():
    """Get list of supported languages for AI analysis."""
    try:
        languages = [
            Language(code=code, name=name)
            for code, name in vertex_service.supported_languages.items()
        ]
        return SupportedLanguagesResponse(
            languages=languages,
            total_count=len(languages)
        )
    except Exception as e:
        logger.error("Failed to get supported languages", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to retrieve supported languages")


@router.get("/language-info/{language_code}", response_model=LanguageInfoResponse)
async def get_language_info(language_code: str):
    """Get information about a specific language."""
    if language_code not in vertex_service.supported_languages:
        raise HTTPException(status_code=404, detail=f"Language code {language_code} not found")

    return LanguageInfoResponse(
        code=language_code,
        name=vertex_service.supported_languages[language_code],
        supported=True
    )
