"""
CareerGPT Coach Service for TRAVAIA
AI-powered career coaching with LiveKit WebRTC integration
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, Any
import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded


# Import new infrastructure components
from shared.circuit_breaker import circuit_breaker, FIREBASE_CIRCUIT_BREAKER, EXTERNAL_API_CIRCUIT_BREAKER
from shared.database_pool import get_firestore_client, connection_pool_cleanup_task
from shared.health_checks import HealthChecker, SERVICE_EXTERNAL_DEPENDENCIES
from pydantic import BaseModel
import structlog
import httpx
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Google Cloud imports
from google.cloud import aiplatform
import google.generativeai as genai
from google.cloud import pubsub_v1
import firebase_admin
from firebase_admin import credentials, firestore

# LiveKit imports
from livekit import Room, RemoteAudioTrack, LocalAudioTrack, AudioFrame
from livekit.rtc import AudioSource
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), "../shared"))
from livekit_auth import LiveKitTokenService, generate_coaching_token, generate_bot_token

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv('GOOGLE_APPLICATION_CREDENTIALS'))
    firebase_admin.initialize_app(cred)

db = firestore.client()

# Initialize Google Cloud clients
publisher = pubsub_v1.PublisherClient()
subscriber = pubsub_v1.SubscriberClient()

# Initialize Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Initialize FastAPI app
app = FastAPI(
    title="CareerGPT Coach Service",
    description="AI-powered career coaching with voice capabilities",
    version="1.0.0"
)

# Rate Limiting Configuration
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration - Production Ready
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://travaia.co",
        "https://app.travaia.co", 
        "https://admin.travaia.co",
        "https://travaia-e1310.web.app",
        "https://travaia-e1310.firebaseapp.com",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin"],
    max_age=86400
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["travaia.co", "*.travaia.co", "localhost", "127.0.0.1"]
)

# Security Middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    """Limit request size to prevent DoS attacks"""
    if request.headers.get("content-length"):
        content_length = int(request.headers["content-length"])
        if content_length > 10_000_000:  # 10MB limit
            raise HTTPException(413, "Request entity too large")
    return await call_next(request)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Pydantic models
class CoachingRequest(BaseModel):
    user_id: str
    message: str
    context_type: str = "general"  # general, interview_prep, career_planning, job_search
    include_voice: bool = False
    voice_settings: Optional[Dict] = None

class VoiceCoachingSession(BaseModel):
    session_id: str
    user_id: str
    coaching_focus: str = "general"
    voice_enabled: bool = True
    language_code: str = "en-US"
    session_duration_minutes: int = 30

class CareerAnalysisRequest(BaseModel):
    user_id: str
    analysis_type: str = "comprehensive"  # comprehensive, skills_gap, career_path, salary_analysis
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    include_recommendations: bool = True

class PersonalizedCoachingPlan(BaseModel):
    user_id: str
    career_goals: List[str]
    current_skills: List[str]
    target_skills: List[str]
    timeline_weeks: int = 12
    focus_areas: List[str]

# Data aggregation service
class UserDataAggregator:
    """Aggregates user data from all TRAVAIA services for personalized coaching"""
    
    def __init__(self):
        self.service_urls = {
            "user_auth": os.getenv('USER_AUTH_SERVICE_URL', 'http://user-auth-service:8080'),
            "ai_engine": os.getenv('AI_ENGINE_SERVICE_URL', 'http://ai-engine-service:8080'),
            "application_job": os.getenv('APPLICATION_JOB_SERVICE_URL', 'http://application-job-service:8080'),
            "document_report": os.getenv('DOCUMENT_REPORT_SERVICE_URL', 'http://document-report-service:8080'),
            "analytics_growth": os.getenv('ANALYTICS_GROWTH_SERVICE_URL', 'http://analytics-growth-service:8080'),
            "interview_session": os.getenv('INTERVIEW_SESSION_SERVICE_URL', 'http://interview-session-service:8080')
        }
    
    async def get_user_profile(self, user_id: str) -> Dict:
        """Get comprehensive user profile from user-auth service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_urls['user_auth']}/api/users/{user_id}/profile")
                return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error("Failed to fetch user profile", user_id=user_id, error=str(e))
            return {}
    
    async def get_interview_performance(self, user_id: str) -> Dict:
        """Get interview performance data from interview-session service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_urls['interview_session']}/api/interviews/{user_id}/performance")
                return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error("Failed to fetch interview performance", user_id=user_id, error=str(e))
            return {}
    
    async def get_job_applications(self, user_id: str) -> List[Dict]:
        """Get job application history from application-job service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_urls['application_job']}/api/applications/{user_id}")
                return response.json() if response.status_code == 200 else []
        except Exception as e:
            logger.error("Failed to fetch job applications", user_id=user_id, error=str(e))
            return []
    
    async def get_skill_assessments(self, user_id: str) -> Dict:
        """Get skill assessments from ai-engine service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_urls['ai_engine']}/api/skills/{user_id}/assessments")
                return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error("Failed to fetch skill assessments", user_id=user_id, error=str(e))
            return {}
    
    async def get_analytics_data(self, user_id: str) -> Dict:
        """Get user analytics from analytics-growth service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.service_urls['analytics_growth']}/api/analytics/{user_id}")
                return response.json() if response.status_code == 200 else {}
        except Exception as e:
            logger.error("Failed to fetch analytics data", user_id=user_id, error=str(e))
            return {}
    
    async def aggregate_user_data(self, user_id: str) -> Dict:
        """Aggregate all user data for comprehensive coaching context"""
        try:
            # Fetch data from all services concurrently
            profile, performance, applications, skills, analytics = await asyncio.gather(
                self.get_user_profile(user_id),
                self.get_interview_performance(user_id),
                self.get_job_applications(user_id),
                self.get_skill_assessments(user_id),
                self.get_analytics_data(user_id),
                return_exceptions=True
            )
            
            # Compile comprehensive user context
            user_context = {
                "user_id": user_id,
                "profile": profile if not isinstance(profile, Exception) else {},
                "interview_performance": performance if not isinstance(performance, Exception) else {},
                "job_applications": applications if not isinstance(applications, Exception) else [],
                "skill_assessments": skills if not isinstance(skills, Exception) else {},
                "analytics": analytics if not isinstance(analytics, Exception) else {},
                "aggregated_at": datetime.utcnow().isoformat()
            }
            
            logger.info("User data aggregated successfully", user_id=user_id)
            return user_context
            
        except Exception as e:
            logger.error("Failed to aggregate user data", user_id=user_id, error=str(e))
            return {"user_id": user_id, "error": str(e)}

# AI Career Coach
class CareerGPTCoach:
    """Advanced AI career coach with personalized guidance"""
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-pro')
        self.data_aggregator = UserDataAggregator()
        
        # Career coaching prompts
        self.system_prompts = {
            "general": """You are CareerGPT, an expert AI career coach for TRAVAIA. You provide personalized, 
            actionable career guidance based on comprehensive user data including interview performance, 
            job applications, skills assessments, and career goals. Be encouraging, specific, and data-driven.""",
            
            "interview_prep": """You are CareerGPT specializing in interview preparation. Analyze the user's 
            interview performance data and provide targeted coaching for improvement. Focus on specific 
            behavioral questions, technical skills, and communication patterns.""",
            
            "career_planning": """You are CareerGPT specializing in strategic career planning. Help users 
            create actionable career roadmaps based on their current skills, target roles, and market trends. 
            Provide specific timelines and milestones.""",
            
            "job_search": """You are CareerGPT specializing in job search optimization. Analyze application 
            success rates, provide company research insights, and optimize job search strategies based on 
            user performance data."""
        }
    
    async def generate_coaching_response(self, user_id: str, message: str, context_type: str = "general") -> Dict:
        """Generate personalized coaching response"""
        try:
            # Aggregate user data
            user_context = await self.data_aggregator.aggregate_user_data(user_id)
            
            # Build context-aware prompt
            system_prompt = self.system_prompts.get(context_type, self.system_prompts["general"])
            
            # Create comprehensive prompt with user data
            full_prompt = f"""
            {system_prompt}
            
            USER CONTEXT:
            - Profile: {json.dumps(user_context.get('profile', {}), indent=2)}
            - Interview Performance: {json.dumps(user_context.get('interview_performance', {}), indent=2)}
            - Recent Applications: {json.dumps(user_context.get('job_applications', [])[:5], indent=2)}
            - Skills Assessment: {json.dumps(user_context.get('skill_assessments', {}), indent=2)}
            - Analytics: {json.dumps(user_context.get('analytics', {}), indent=2)}
            
            USER MESSAGE: {message}
            
            Provide a personalized, actionable response that:
            1. References specific data from their profile/performance
            2. Gives concrete next steps
            3. Includes relevant metrics or benchmarks
            4. Maintains an encouraging, professional tone
            5. Suggests specific TRAVAIA features they should use
            """
            
            # Generate response
            response = await self.model.generate_content_async(full_prompt)
            
            # Store coaching session
            session_id = str(uuid.uuid4())
            doc_ref = db.collection('coaching_sessions').document(session_id)
            doc_ref.set({
                "session_id": session_id,
                "user_id": user_id,
                "context_type": context_type,
                "user_message": message,
                "coach_response": response.text,
                "user_context_summary": {
                    "has_profile": bool(user_context.get('profile')),
                    "interview_count": len(user_context.get('interview_performance', {}).get('sessions', [])),
                    "application_count": len(user_context.get('job_applications', [])),
                    "skill_count": len(user_context.get('skill_assessments', {}).get('skills', []))
                },
                "created_at": datetime.utcnow(),
                "response_length": len(response.text)
            })
            
            # Publish coaching event
            topic_path = publisher.topic_path(os.getenv('GOOGLE_CLOUD_PROJECT'), 'careergpt-events')
            event_data = {
                "event_type": "coaching_response_generated",
                "session_id": session_id,
                "user_id": user_id,
                "context_type": context_type,
                "response_length": len(response.text),
                "timestamp": datetime.utcnow().isoformat()
            }
            publisher.publish(topic_path, json.dumps(event_data).encode('utf-8'))
            
            logger.info("Coaching response generated", session_id=session_id, user_id=user_id, context_type=context_type)
            
            return {
                "session_id": session_id,
                "response": response.text,
                "context_type": context_type,
                "personalization_score": self._calculate_personalization_score(user_context),
                "suggested_actions": self._extract_suggested_actions(response.text)
            }
            
        except Exception as e:
            logger.error("Failed to generate coaching response", user_id=user_id, error=str(e))
            raise HTTPException(status_code=500, detail=f"Coaching response generation failed: {str(e)}")
    
    def _calculate_personalization_score(self, user_context: Dict) -> float:
        """Calculate how personalized the response can be based on available data"""
        score = 0.0
        if user_context.get('profile'): score += 0.2
        if user_context.get('interview_performance'): score += 0.3
        if user_context.get('job_applications'): score += 0.2
        if user_context.get('skill_assessments'): score += 0.2
        if user_context.get('analytics'): score += 0.1
        return min(score, 1.0)
    
    def _extract_suggested_actions(self, response_text: str) -> List[str]:
        """Extract actionable suggestions from the response"""
        # Simple extraction based on common patterns
        actions = []
        lines = response_text.split('\n')
        for line in lines:
            if any(keyword in line.lower() for keyword in ['should', 'recommend', 'suggest', 'try', 'consider']):
                actions.append(line.strip())
        return actions[:5]  # Limit to top 5 actions

# Pipecat Voice Coach
class PipecatVoiceCoach:
    """Voice-enabled coaching using Pipecat framework"""
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
        self.coach = CareerGPTCoach()
    
    async def create_voice_session(self, session_config: VoiceCoachingSession) -> Dict:
        """Create a new voice coaching session with Pipecat"""
        try:
            # Initialize Pipecat services
            tts_service = CartesiaTTSService(
                api_key=os.getenv('CARTESIA_API_KEY'),
                voice_id="a0e99841-438c-4a64-b679-ae501e7d6091",  # Professional voice
                model="sonic-english"
            )
            
            stt_service = DeepgramSTTService(
                api_key=os.getenv('DEEPGRAM_API_KEY'),
                model="nova-2",
                language=session_config.language_code
            )
            
            llm_service = OpenAILLMService(
                api_key=os.getenv('OPENAI_API_KEY'),
                model="gpt-4-turbo-preview"
            )
            
            # Create VAD analyzer
            vad_analyzer = SileroVADAnalyzer()
            
            # Create pipeline
            pipeline = Pipeline([
                stt_service,
                llm_service,
                tts_service,
                vad_analyzer
            ])
            
            # Store session
            self.active_sessions[session_config.session_id] = {
                "config": session_config,
                "pipeline": pipeline,
                "start_time": datetime.utcnow(),
                "message_count": 0,
                "is_active": True
            }
            
            logger.info("Voice coaching session created", session_id=session_config.session_id)
            
            return {
                "session_id": session_config.session_id,
                "status": "created",
                "voice_enabled": True,
                "language_code": session_config.language_code
            }
            
        except Exception as e:
            logger.error("Failed to create voice session", session_id=session_config.session_id, error=str(e))
            raise HTTPException(status_code=500, detail=f"Voice session creation failed: {str(e)}")
    
    async def process_voice_message(self, session_id: str, audio_frame: AudioFrame) -> Dict:
        """Process voice message through Pipecat pipeline"""
        if session_id not in self.active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        try:
            session = self.active_sessions[session_id]
            pipeline = session["pipeline"]
            
            # Process audio through pipeline
            result_frames = await pipeline.process_frame(audio_frame)
            
            # Extract text and generate coaching response
            text_frames = [f for f in result_frames if isinstance(f, TextFrame)]
            if text_frames:
                user_message = text_frames[0].text
                
                # Generate coaching response
                coaching_response = await self.coach.generate_coaching_response(
                    session["config"].user_id,
                    user_message,
                    session["config"].coaching_focus
                )
                
                # Update session stats
                session["message_count"] += 1
                
                return {
                    "session_id": session_id,
                    "user_message": user_message,
                    "coach_response": coaching_response["response"],
                    "audio_response": True,  # Indicates audio will be generated
                    "message_count": session["message_count"]
                }
            
            return {"session_id": session_id, "status": "processing"}
            
        except Exception as e:
            logger.error("Failed to process voice message", session_id=session_id, error=str(e))
            raise HTTPException(status_code=500, detail=f"Voice message processing failed: {str(e)}")

# Initialize services
coach = CareerGPTCoach()
voice_coach = PipecatVoiceCoach()

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "careergpt-coach-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "active_voice_sessions": len(voice_coach.active_sessions)
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("careergpt-coach-service", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("careergpt-coach-service", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200
            
        return result
    except Exception as e:
        return {
            "service": "careergpt-coach-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, 503

@app.post("/api/coaching/chat")
async def coaching_chat(request: CoachingRequest):
    """Text-based coaching conversation"""
    try:
        response = await coach.generate_coaching_response(
            request.user_id,
            request.message,
            request.context_type
        )
        
        return {
            "success": True,
            "session_id": response["session_id"],
            "response": response["response"],
            "context_type": request.context_type,
            "personalization_score": response["personalization_score"],
            "suggested_actions": response["suggested_actions"]
        }
        
    except Exception as e:
        logger.error("Coaching chat failed", user_id=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coaching/voice/start")
async def start_voice_coaching(session_config: VoiceCoachingSession):
    """Start a voice coaching session"""
    try:
        result = await voice_coach.create_voice_session(session_config)
        return {"success": True, **result}
        
    except Exception as e:
        logger.error("Voice coaching start failed", session_id=session_config.session_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analysis/career")
async def career_analysis(request: CareerAnalysisRequest):
    """Comprehensive career analysis"""
    try:
        # Aggregate user data
        user_context = await coach.data_aggregator.aggregate_user_data(request.user_id)
        
        # Generate analysis based on type
        analysis_prompt = f"""
        Provide a comprehensive {request.analysis_type} career analysis for this user:
        
        USER DATA:
        {json.dumps(user_context, indent=2)}
        
        TARGET ROLE: {request.target_role or 'Not specified'}
        TARGET COMPANY: {request.target_company or 'Not specified'}
        
        Include:
        1. Current career position assessment
        2. Skills gap analysis
        3. Market positioning
        4. Specific recommendations
        5. Timeline for improvement
        """
        
        response = await coach.model.generate_content_async(analysis_prompt)
        
        # Store analysis
        analysis_id = str(uuid.uuid4())
        doc_ref = db.collection('career_analyses').document(analysis_id)
        doc_ref.set({
            "analysis_id": analysis_id,
            "user_id": request.user_id,
            "analysis_type": request.analysis_type,
            "target_role": request.target_role,
            "target_company": request.target_company,
            "analysis_result": response.text,
            "created_at": datetime.utcnow()
        })
        
        logger.info("Career analysis completed", analysis_id=analysis_id, user_id=request.user_id)
        
        return {
            "analysis_id": analysis_id,
            "analysis_type": request.analysis_type,
            "result": response.text,
            "recommendations_included": request.include_recommendations
        }
        
    except Exception as e:
        logger.error("Career analysis failed", user_id=request.user_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/coaching/voice/{session_id}")
async def voice_coaching_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice coaching"""
    await websocket.accept()
    
    try:
        while True:
            # Receive audio data
            data = await websocket.receive_bytes()
            
            # Create audio frame
            audio_frame = AudioFrame(data)
            
            # Process through voice coach
            result = await voice_coach.process_voice_message(session_id, audio_frame)
            
            # Send response
            await websocket.send_text(json.dumps(result))
            
    except WebSocketDisconnect:
        # Clean up session
        if session_id in voice_coach.active_sessions:
            voice_coach.active_sessions[session_id]["is_active"] = False
        logger.info("Voice coaching session disconnected", session_id=session_id)
    except Exception as e:
        logger.error("Voice coaching WebSocket error", session_id=session_id, error=str(e))
        await websocket.send_text(json.dumps({"error": str(e)}))


# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
