"""
Event Handlers for AI Engine Service
Processes incoming Pub/Sub events for enterprise-grade microservice communication
"""

import json
import asyncio
from typing import Dict, Any, List
import structlog
import uuid
from datetime import datetime
from services.vertex_ai_service import VertexAIService
from services.speech_service import SpeechService
from services.pubsub_service import PubSubService

# Initialize logger
logger = structlog.get_logger(__name__)

class EventHandlers:
    """Handlers for processing incoming events from other services"""
    
    def __init__(self, vertex_ai_service: VertexAIService, speech_service: SpeechService, pubsub_service: PubSubService):
        """Initialize with required service dependencies"""
        self.vertex_ai_service = vertex_ai_service
        self.speech_service = speech_service
        self.pubsub_service = pubsub_service
        logger.info("Event handlers initialized")
    
    async def handle_job_analysis_request(self, data: Dict[str, Any], attributes: Dict[str, str]) -> None:
        """
        Handle incoming job analysis requests from Application & Job Service
        
        Event data format:
        {
            "user_id": "user123",
            "request_id": "req456",
            "user_profile": {...},
            "job_description": "...",
            "analysis_type": "comprehensive"
        }
        """
        try:
            logger.info("Processing job analysis request", 
                user_id=data.get("user_id"),
                request_id=data.get("request_id"),
                analysis_type=data.get("analysis_type", "comprehensive")
            )
            
            # Validate required fields
            required_fields = ["user_id", "request_id", "user_profile", "job_description"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Process analysis using VertexAIService
            analysis_result = await self.vertex_ai_service.analyze_job_fit(
                user_profile=data["user_profile"],
                job_description=data["job_description"]
            )
            
            # Enrich the result with metadata
            analysis_result.update({
                "user_id": data["user_id"],
                "request_id": data["request_id"],
                "analysis_type": data.get("analysis_type", "comprehensive"),
                "analysis_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "source_service": "ai-engine-service"
            })
            
            # Publish the result back to Application & Job Service
            await self.pubsub_service.publish_event(
                topic_name="job_analysis", 
                data={
                    "event_type": "job_analysis_completed",
                    "payload": analysis_result
                },
                attributes={
                    "user_id": data["user_id"],
                    "request_id": data["request_id"],
                    "analysis_id": analysis_result["analysis_id"]
                }
            )
            
            logger.info("Job analysis completed and published", 
                request_id=data["request_id"],
                analysis_id=analysis_result["analysis_id"],
                user_id=data["user_id"]
            )
            
        except Exception as e:
            logger.error("Error handling job analysis request", 
                error=str(e),
                user_id=data.get("user_id"),
                request_id=data.get("request_id")
            )
            
            # Publish error event
            await self.pubsub_service.publish_event(
                topic_name="job_analysis",
                data={
                    "event_type": "job_analysis_failed",
                    "error": str(e),
                    "user_id": data.get("user_id"),
                    "request_id": data.get("request_id"),
                    "timestamp": datetime.utcnow().isoformat()
                },
                attributes={
                    "error": "true",
                    "user_id": data.get("user_id", "unknown"),
                    "request_id": data.get("request_id", "unknown")
                }
            )
    
    async def handle_interview_questions_request(self, data: Dict[str, Any], attributes: Dict[str, str]) -> None:
        """
        Handle incoming interview questions requests from Interview & Session Service
        
        Event data format:
        {
            "user_id": "user123",
            "request_id": "req456",
            "job_description": "...",
            "user_profile": {...},
            "difficulty": "medium",
            "language": "en",
            "count": 10
        }
        """
        try:
            logger.info("Processing interview questions request", 
                user_id=data.get("user_id"),
                request_id=data.get("request_id"),
                language=data.get("language", "en")
            )
            
            # Validate required fields
            required_fields = ["user_id", "request_id", "job_description"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Set default user profile if not provided
            user_profile = data.get("user_profile", {
                "skills": [],
                "experience_level": "mid",
                "industry": "general"
            })
            
            # Generate questions using VertexAIService
            questions_result = await self.vertex_ai_service.generate_interview_questions(
                job_description=data["job_description"],
                user_profile=user_profile,
                difficulty=data.get("difficulty", "medium"),
                language=data.get("language", "en"),
                count=data.get("count", 10)
            )
            
            # Enrich the result with metadata
            questions_result.update({
                "user_id": data["user_id"],
                "request_id": data["request_id"],
                "question_set_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "source_service": "ai-engine-service",
                "language": data.get("language", "en")
            })
            
            # Publish the result back to Interview & Session Service
            await self.pubsub_service.publish_event(
                topic_name="interview_questions", 
                data={
                    "event_type": "interview_questions_generated",
                    "payload": questions_result
                },
                attributes={
                    "user_id": data["user_id"],
                    "request_id": data["request_id"],
                    "question_set_id": questions_result["question_set_id"],
                    "language": data.get("language", "en")
                }
            )
            
            logger.info("Interview questions generated and published", 
                request_id=data["request_id"],
                question_set_id=questions_result["question_set_id"],
                question_count=len(questions_result["questions"]),
                user_id=data["user_id"]
            )
            
        except Exception as e:
            logger.error("Error handling interview questions request", 
                error=str(e),
                user_id=data.get("user_id"),
                request_id=data.get("request_id")
            )
            
            # Publish error event
            await self.pubsub_service.publish_event(
                topic_name="interview_questions",
                data={
                    "event_type": "interview_questions_failed",
                    "error": str(e),
                    "user_id": data.get("user_id"),
                    "request_id": data.get("request_id"),
                    "timestamp": datetime.utcnow().isoformat()
                },
                attributes={
                    "error": "true",
                    "user_id": data.get("user_id", "unknown"),
                    "request_id": data.get("request_id", "unknown")
                }
            )
    
    async def handle_interview_feedback_request(self, data: Dict[str, Any], attributes: Dict[str, str]) -> None:
        """
        Handle incoming interview feedback requests from Interview & Session Service
        
        Event data format:
        {
            "user_id": "user123",
            "request_id": "req456",
            "interview_data": {
                "responses": [...],
                "duration": 30,
                "job_title": "Software Engineer"
            }
        }
        """
        try:
            logger.info("Processing interview feedback request", 
                user_id=data.get("user_id"),
                request_id=data.get("request_id"),
                interview_id=data.get("interview_id")
            )
            
            # Validate required fields
            required_fields = ["user_id", "request_id", "interview_data"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Generate comprehensive feedback
            feedback_result = await self.vertex_ai_service.generate_comprehensive_feedback(
                interview_data=data["interview_data"]
            )
            
            # Enrich the result with metadata
            feedback_result.update({
                "user_id": data["user_id"],
                "request_id": data["request_id"],
                "interview_id": data.get("interview_id", str(uuid.uuid4())),
                "feedback_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "source_service": "ai-engine-service"
            })
            
            # Publish the result back to Interview & Session Service
            await self.pubsub_service.publish_event(
                topic_name="interview_feedback", 
                data={
                    "event_type": "interview_feedback_generated",
                    "payload": feedback_result
                },
                attributes={
                    "user_id": data["user_id"],
                    "request_id": data["request_id"],
                    "interview_id": data.get("interview_id", "unknown"),
                    "feedback_id": feedback_result["feedback_id"]
                }
            )
            
            logger.info("Interview feedback generated and published", 
                request_id=data["request_id"],
                feedback_id=feedback_result["feedback_id"],
                interview_id=data.get("interview_id"),
                user_id=data["user_id"]
            )
            
        except Exception as e:
            logger.error("Error handling interview feedback request", 
                error=str(e),
                user_id=data.get("user_id"),
                request_id=data.get("request_id")
            )
            
            # Publish error event
            await self.pubsub_service.publish_event(
                topic_name="interview_feedback",
                data={
                    "event_type": "interview_feedback_failed",
                    "error": str(e),
                    "user_id": data.get("user_id"),
                    "request_id": data.get("request_id"),
                    "interview_id": data.get("interview_id", "unknown"),
                    "timestamp": datetime.utcnow().isoformat()
                },
                attributes={
                    "error": "true",
                    "user_id": data.get("user_id", "unknown"),
                    "request_id": data.get("request_id", "unknown"),
                    "interview_id": data.get("interview_id", "unknown")
                }
            )
    
    async def handle_speech_processing_request(self, data: Dict[str, Any], attributes: Dict[str, str]) -> None:
        """
        Handle incoming speech processing requests (TTS/STT) from Interview & Session Service
        
        Event data format for STT:
        {
            "user_id": "user123",
            "request_id": "req456",
            "audio_url": "gs://bucket/path/to/audio.wav",
            "operation_type": "stt",
            "language_code": "en-US"
        }
        
        Event data format for TTS:
        {
            "user_id": "user123",
            "request_id": "req456",
            "text": "Text to be converted to speech",
            "operation_type": "tts", 
            "voice_name": "en-US-Standard-A",
            "language_code": "en-US"
        }
        """
        try:
            logger.info("Processing speech request", 
                user_id=data.get("user_id"),
                request_id=data.get("request_id"),
                operation_type=data.get("operation_type")
            )
            
            # Validate required fields
            required_fields = ["user_id", "request_id", "operation_type"]
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
            
            operation_type = data["operation_type"].lower()
            result = None
            
            if operation_type == "stt":
                # Speech-to-Text operation
                if "audio_url" not in data:
                    raise ValueError("Missing audio_url for STT operation")
                    
                result = await self.speech_service.transcribe_audio(
                    audio_uri=data["audio_url"],
                    language_code=data.get("language_code", "en-US")
                )
                
            elif operation_type == "tts":
                # Text-to-Speech operation
                if "text" not in data:
                    raise ValueError("Missing text for TTS operation")
                    
                result = await self.speech_service.synthesize_speech(
                    text=data["text"],
                    voice_name=data.get("voice_name", "en-US-Standard-A"),
                    language_code=data.get("language_code", "en-US")
                )
                
            else:
                raise ValueError(f"Invalid operation_type: {operation_type}, must be 'stt' or 'tts'")
            
            # Enrich the result with metadata
            result_payload = {
                "user_id": data["user_id"],
                "request_id": data["request_id"],
                "operation_type": operation_type,
                "processing_id": str(uuid.uuid4()),
                "timestamp": datetime.utcnow().isoformat(),
                "source_service": "ai-engine-service",
                "result": result
            }
            
            # Publish the result back
            await self.pubsub_service.publish_event(
                topic_name="speech_processing", 
                data={
                    "event_type": f"speech_{operation_type}_completed",
                    "payload": result_payload
                },
                attributes={
                    "user_id": data["user_id"],
                    "request_id": data["request_id"],
                    "operation_type": operation_type,
                    "processing_id": result_payload["processing_id"]
                }
            )
            
            logger.info(f"Speech {operation_type} completed and published", 
                request_id=data["request_id"],
                processing_id=result_payload["processing_id"],
                user_id=data["user_id"]
            )
            
        except Exception as e:
            logger.error("Error handling speech processing request", 
                error=str(e),
                user_id=data.get("user_id"),
                request_id=data.get("request_id"),
                operation_type=data.get("operation_type")
            )
            
            # Publish error event
            await self.pubsub_service.publish_event(
                topic_name="speech_processing",
                data={
                    "event_type": "speech_processing_failed",
                    "error": str(e),
                    "user_id": data.get("user_id"),
                    "request_id": data.get("request_id"),
                    "operation_type": data.get("operation_type", "unknown"),
                    "timestamp": datetime.utcnow().isoformat()
                },
                attributes={
                    "error": "true",
                    "user_id": data.get("user_id", "unknown"),
                    "request_id": data.get("request_id", "unknown"),
                    "operation_type": data.get("operation_type", "unknown")
                }
            )
