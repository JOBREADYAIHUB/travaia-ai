"""
Voice Processing Service for TRAVAIA
Handles Google Cloud TTS/STT with streaming and voice optimization
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Optional, AsyncGenerator
import uuid
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Request
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

# Google Cloud imports
from google.cloud import texttospeech
from google.cloud import speech
from google.cloud import storage
from google.cloud import pubsub_v1
import firebase_admin
from firebase_admin import credentials, firestore

# Audio processing imports
import numpy as np
import librosa
import soundfile as sf
from pydub import AudioSegment
import io

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

# Initialize Firebase Admin SDK with proper error handling
db = None
try:
    if not firebase_admin._apps:
        # Use Application Default Credentials for Cloud Run
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully")
    db = firestore.client()
except Exception as e:
    logger.warning("Firebase initialization failed, continuing without Firebase", error=str(e))
    db = None

# db initialized above

# Initialize Google Cloud clients with error handling
tts_client = None
speech_client = None
storage_client = None
publisher = None

try:
    tts_client = texttospeech.TextToSpeechClient()
    speech_client = speech.SpeechClient()
    storage_client = storage.Client()
    publisher = pubsub_v1.PublisherClient()
    logger.info("Google Cloud clients initialized successfully")
except Exception as e:
    logger.warning("Google Cloud client initialization failed, continuing without some features", error=str(e))
    tts_client = None
    speech_client = None
    storage_client = None
    publisher = None

# Initialize FastAPI app
app = FastAPI(
    title="Voice Processing Service",
    description="Google Cloud TTS/STT with streaming and voice optimization",
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
        if content_length > 50_000_000:  # 50MB limit for audio files
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
class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-US"
    voice_name: Optional[str] = None
    speaking_rate: float = 1.0
    pitch: float = 0.0
    volume_gain_db: float = 0.0
    audio_encoding: str = "MP3"
    optimize_for: str = "telephony"  # telephony, desktop, handset

class STTRequest(BaseModel):
    audio_encoding: str = "WEBM_OPUS"
    sample_rate_hertz: int = 48000
    language_code: str = "en-US"
    enable_automatic_punctuation: bool = True
    enable_word_time_offsets: bool = True
    enable_speaker_diarization: bool = False
    max_alternatives: int = 1

class VoiceOptimizationRequest(BaseModel):
    audio_data: bytes
    optimization_type: str = "noise_reduction"  # noise_reduction, echo_cancellation, volume_normalization
    target_sample_rate: int = 16000

class StreamingSession(BaseModel):
    session_id: str
    user_id: str
    language_code: str = "en-US"
    audio_encoding: str = "WEBM_OPUS"
    sample_rate_hertz: int = 48000

# Global connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.streaming_sessions: Dict[str, Dict] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info("WebSocket connected", session_id=session_id)

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.streaming_sessions:
            del self.streaming_sessions[session_id]
        logger.info("WebSocket disconnected", session_id=session_id)

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(json.dumps(message))

manager = ConnectionManager()

# Voice optimization functions
def optimize_audio(audio_data: bytes, optimization_type: str, target_sample_rate: int = 16000) -> bytes:
    """Apply audio optimizations for voice processing"""
    try:
        # Convert bytes to audio array
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_data))
        
        # Convert to numpy array
        samples = np.array(audio_segment.get_array_of_samples())
        if audio_segment.channels == 2:
            samples = samples.reshape((-1, 2))
            samples = samples.mean(axis=1)  # Convert to mono
        
        # Normalize sample rate
        original_rate = audio_segment.frame_rate
        if original_rate != target_sample_rate:
            samples = librosa.resample(samples.astype(float), 
                                     orig_sr=original_rate, 
                                     target_sr=target_sample_rate)
        
        # Apply optimizations
        if optimization_type == "noise_reduction":
            # Simple noise gate
            threshold = np.percentile(np.abs(samples), 10)
            samples = np.where(np.abs(samples) < threshold, 0, samples)
            
        elif optimization_type == "volume_normalization":
            # Normalize volume
            max_val = np.max(np.abs(samples))
            if max_val > 0:
                samples = samples / max_val * 0.8
                
        elif optimization_type == "echo_cancellation":
            # Basic high-pass filter to reduce echo
            try:
                from scipy.signal import butter, filtfilt
                nyquist = target_sample_rate / 2
                low = 300 / nyquist
                b, a = butter(4, low, btype='high')
                samples = filtfilt(b, a, samples)
            except ImportError:
                logger.warning("scipy not available, skipping echo cancellation")
                pass
        
        # Convert back to audio format
        samples = (samples * 32767).astype(np.int16)
        optimized_audio = AudioSegment(
            samples.tobytes(),
            frame_rate=target_sample_rate,
            sample_width=2,
            channels=1
        )
        
        # Export to bytes
        output_buffer = io.BytesIO()
        optimized_audio.export(output_buffer, format="wav")
        return output_buffer.getvalue()
        
    except Exception as e:
        logger.error("Audio optimization failed", error=str(e))
        return audio_data

# API Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "voice-processing-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
@limiter.limit("30/minute")
async def detailed_health_check(request: Request):
    """Comprehensive health check with dependency validation."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        health_checker = HealthChecker("voice-processing-service", project_id)
        
        # Get external service dependencies
        external_services = SERVICE_EXTERNAL_DEPENDENCIES.get("voice-processing-service", [])
        result = await health_checker.run_comprehensive_health_check(external_services)
        
        # Set HTTP status based on health
        if result["overall_status"] == "unhealthy":
            return result, 503
        elif result["overall_status"] == "degraded":
            return result, 200
            
        return result
    except Exception as e:
        return {
            "service": "voice-processing-service",
            "overall_status": "unhealthy",
            "error": f"Health check failed: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }, 503

@app.post("/api/tts/synthesize")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using Google Cloud TTS"""
    if not tts_client:
        raise HTTPException(status_code=503, detail="TTS service unavailable")
    
    try:
        # Configure voice
        voice = texttospeech.VoiceSelectionParams(
            language_code=request.language_code,
            name=request.voice_name
        )
        
        # Configure audio
        audio_config = texttospeech.AudioConfig(
            audio_encoding=getattr(texttospeech.AudioEncoding, request.audio_encoding),
            speaking_rate=request.speaking_rate,
            pitch=request.pitch,
            volume_gain_db=request.volume_gain_db
        )
        
        # Optimize for use case
        if request.optimize_for == "telephony":
            audio_config.effects_profile_id = ["telephony-class-application"]
        elif request.optimize_for == "handset":
            audio_config.effects_profile_id = ["handset-class-device"]
        
        # Synthesize speech
        synthesis_input = texttospeech.SynthesisInput(text=request.text)
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        # Store audio in Cloud Storage
        audio_id = str(uuid.uuid4())
        bucket_name = os.getenv('VOICE_STORAGE_BUCKET', 'travaia-voice-storage')
        blob_name = f"tts/{audio_id}.{request.audio_encoding.lower()}"
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_string(response.audio_content)
        
        # Publish event
        if publisher:
            try:
                topic_path = publisher.topic_path(os.getenv('GOOGLE_CLOUD_PROJECT'), 'voice-events')
                event_data = {
                    "event_type": "tts_completed",
                    "audio_id": audio_id,
                    "text_length": len(request.text),
                    "language_code": request.language_code,
                    "timestamp": datetime.utcnow().isoformat()
                }
                publisher.publish(topic_path, json.dumps(event_data).encode('utf-8'))
            except Exception as e:
                logger.warning("Failed to publish voice event", error=str(e))
        
        logger.info("TTS synthesis completed", audio_id=audio_id, text_length=len(request.text))
        
        return {
            "audio_id": audio_id,
            "audio_url": f"gs://{bucket_name}/{blob_name}",
            "duration_estimate": len(request.text) / 200 * 60,  # Rough estimate
            "audio_encoding": request.audio_encoding
        }
        
    except Exception as e:
        logger.error("TTS synthesis failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")

@app.post("/api/stt/transcribe")
async def speech_to_text(file: UploadFile = File(...), config: STTRequest = None):
    """Convert speech to text using Google Cloud STT"""
    if not speech_client:
        raise HTTPException(status_code=503, detail="STT service unavailable")
    
    try:
        if config is None:
            config = STTRequest()
            
        # Read audio file
        audio_content = await file.read()
        
        # Optimize audio for STT
        optimized_audio = optimize_audio(audio_content, "noise_reduction", config.sample_rate_hertz)
        
        # Configure recognition
        audio = speech.RecognitionAudio(content=optimized_audio)
        recognition_config = speech.RecognitionConfig(
            encoding=getattr(speech.RecognitionConfig.AudioEncoding, config.audio_encoding),
            sample_rate_hertz=config.sample_rate_hertz,
            language_code=config.language_code,
            enable_automatic_punctuation=config.enable_automatic_punctuation,
            enable_word_time_offsets=config.enable_word_time_offsets,
            max_alternatives=config.max_alternatives,
            model="latest_long",
            use_enhanced=True
        )
        
        if config.enable_speaker_diarization:
            recognition_config.diarization_config = speech.SpeakerDiarizationConfig(
                enable_speaker_diarization=True,
                min_speaker_count=1,
                max_speaker_count=2
            )
        
        # Perform recognition
        response = speech_client.recognize(config=recognition_config, audio=audio)
        
        # Process results
        transcripts = []
        for result in response.results:
            alternative = result.alternatives[0]
            transcript_data = {
                "transcript": alternative.transcript,
                "confidence": alternative.confidence,
                "words": []
            }
            
            if config.enable_word_time_offsets:
                for word in alternative.words:
                    transcript_data["words"].append({
                        "word": word.word,
                        "start_time": word.start_time.total_seconds(),
                        "end_time": word.end_time.total_seconds(),
                        "confidence": getattr(word, 'confidence', 0.0)
                    })
            
            transcripts.append(transcript_data)
        
        # Store transcription result
        transcription_id = str(uuid.uuid4())
        if db:
            try:
                doc_ref = db.collection('voice_transcriptions').document(transcription_id)
                doc_ref.set({
                    "transcription_id": transcription_id,
                    "transcripts": transcripts,
                    "language_code": config.language_code,
                    "created_at": datetime.utcnow(),
                    "audio_duration": len(optimized_audio) / (config.sample_rate_hertz * 2),  # Rough estimate
                    "file_name": file.filename
                })
            except Exception as e:
                logger.warning("Failed to store transcription in Firestore", error=str(e))
        
        # Publish event
        if publisher:
            try:
                topic_path = publisher.topic_path(os.getenv('GOOGLE_CLOUD_PROJECT'), 'voice-events')
                event_data = {
                    "event_type": "stt_completed",
                    "transcription_id": transcription_id,
                    "language_code": config.language_code,
                    "transcript_count": len(transcripts),
                    "timestamp": datetime.utcnow().isoformat()
                }
                publisher.publish(topic_path, json.dumps(event_data).encode('utf-8'))
            except Exception as e:
                logger.warning("Failed to publish voice event", error=str(e))
        
        logger.info("STT transcription completed", transcription_id=transcription_id, transcript_count=len(transcripts))
        
        return {
            "transcription_id": transcription_id,
            "transcripts": transcripts,
            "language_code": config.language_code
        }
        
    except Exception as e:
        logger.error("STT transcription failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"STT transcription failed: {str(e)}")

@app.websocket("/api/stream/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time voice streaming"""
    await manager.connect(websocket, session_id)
    
    try:
        # Initialize streaming session
        streaming_config = None
        audio_buffer = b""
        
        while True:
            # Receive message
            message = await websocket.receive_text()
            data = json.loads(message)
            
            if data["type"] == "start_session":
                # Initialize streaming session
                session_config = StreamingSession(**data["config"])
                manager.streaming_sessions[session_id] = {
                    "config": session_config,
                    "buffer": b"",
                    "is_active": True
                }
                
                # Configure streaming recognition
                streaming_config = speech.StreamingRecognitionConfig(
                    config=speech.RecognitionConfig(
                        encoding=getattr(speech.RecognitionConfig.AudioEncoding, session_config.audio_encoding),
                        sample_rate_hertz=session_config.sample_rate_hertz,
                        language_code=session_config.language_code,
                        enable_automatic_punctuation=True,
                        model="latest_short",
                        use_enhanced=True
                    ),
                    interim_results=True,
                    single_utterance=False
                )
                
                await manager.send_message(session_id, {
                    "type": "session_started",
                    "session_id": session_id
                })
                
            elif data["type"] == "audio_chunk":
                # Process audio chunk
                if session_id in manager.streaming_sessions:
                    audio_chunk = data["audio_data"].encode('latin1')  # Binary data
                    
                    # Add to buffer
                    manager.streaming_sessions[session_id]["buffer"] += audio_chunk
                    
                    # Process when buffer reaches threshold (e.g., 1 second of audio)
                    buffer_size = len(manager.streaming_sessions[session_id]["buffer"])
                    threshold = session_config.sample_rate_hertz * 2  # 1 second of 16-bit audio
                    
                    if buffer_size >= threshold:
                        # Optimize audio
                        optimized_audio = optimize_audio(
                            manager.streaming_sessions[session_id]["buffer"],
                            "noise_reduction",
                            session_config.sample_rate_hertz
                        )
                        
                        # Perform streaming recognition
                        audio_request = speech.StreamingRecognizeRequest(
                            audio_content=optimized_audio
                        )
                        
                        # Send recognition result
                        await manager.send_message(session_id, {
                            "type": "transcription_chunk",
                            "transcript": "Processing...",  # Placeholder for actual streaming
                            "is_final": False,
                            "confidence": 0.0
                        })
                        
                        # Clear buffer
                        manager.streaming_sessions[session_id]["buffer"] = b""
                
            elif data["type"] == "end_session":
                # End streaming session
                if session_id in manager.streaming_sessions:
                    manager.streaming_sessions[session_id]["is_active"] = False
                    
                await manager.send_message(session_id, {
                    "type": "session_ended",
                    "session_id": session_id
                })
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logger.error("WebSocket error", session_id=session_id, error=str(e))
        await manager.send_message(session_id, {
            "type": "error",
            "message": str(e)
        })
        manager.disconnect(session_id)

@app.post("/api/optimize/audio")
async def optimize_audio_endpoint(file: UploadFile = File(...), request: VoiceOptimizationRequest = None):
    """Optimize audio for voice processing"""
    try:
        if request is None:
            request = VoiceOptimizationRequest()
            
        # Read audio file
        audio_content = await file.read()
        
        # Apply optimization
        optimized_audio = optimize_audio(
            audio_content,
            request.optimization_type,
            request.target_sample_rate
        )
        
        # Store optimized audio
        audio_id = str(uuid.uuid4())
        bucket_name = os.getenv('VOICE_STORAGE_BUCKET', 'travaia-voice-storage')
        blob_name = f"optimized/{audio_id}.wav"
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_string(optimized_audio)
        
        logger.info("Audio optimization completed", audio_id=audio_id, optimization_type=request.optimization_type)
        
        return {
            "audio_id": audio_id,
            "optimized_audio_url": f"gs://{bucket_name}/{blob_name}",
            "optimization_type": request.optimization_type,
            "target_sample_rate": request.target_sample_rate
        }
        
    except Exception as e:
        logger.error("Audio optimization failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Audio optimization failed: {str(e)}")


# Startup event to initialize connection pool cleanup
@app.on_event("startup")
async def startup_event():
    """Initialize background tasks on startup"""
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
    # Start connection pool cleanup task
    asyncio.create_task(connection_pool_cleanup_task(project_id))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_config=None
    )
