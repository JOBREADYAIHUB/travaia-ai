"""
API Dependencies and Shared Utilities
"""

from fastapi import Depends, Request
from services.cache_service import CacheService
from services.vertex_ai_service import VertexAIService
from services.speech_service import SpeechService
from services.pubsub_service import PubSubService
from services.auth_service import AuthService
from services.monitoring_service import MonitoringService

async def get_cache_service(request: Request) -> CacheService:
    """Get cache service from app state"""
    return request.app.state.cache_service

async def get_vertex_ai_service(request: Request) -> VertexAIService:
    """Get Vertex AI service from app state"""
    return request.app.state.vertex_ai_service

async def get_speech_service(request: Request) -> SpeechService:
    """Get speech service from app state"""
    return request.app.state.speech_service

async def get_pubsub_service(request: Request) -> PubSubService:
    """Get Pub/Sub service from app state"""
    return request.app.state.pubsub_service


async def get_auth_service(request: Request) -> AuthService:
    """Get auth service from app state"""
    return request.app.state.auth_service


async def get_monitoring_service(request: Request) -> MonitoringService:
    """Get monitoring service from app state"""
    return request.app.state.monitoring_service
