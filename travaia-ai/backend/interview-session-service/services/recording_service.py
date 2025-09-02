"""
Recording Service - Interview recording management and processing
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import structlog
from google.cloud import firestore, storage, pubsub_v1
from fastapi import UploadFile
import json

logger = structlog.get_logger(__name__)

class RecordingService:
    def __init__(self):
        self.db = firestore.AsyncClient()
        self.storage_client = storage.Client()
        self.bucket_name = "travaia-recordings"  # Configure as needed
        self.publisher = pubsub_v1.PublisherClient()
        self.project_id = "travaia-e1310"  # Configure as needed
        
    async def upload_recording(self, session_id: str, file: UploadFile, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Upload interview recording to Firebase Storage"""
        try:
            recording_id = str(uuid.uuid4())
            
            # Generate file path
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'mp4'
            file_path = f"recordings/{metadata.get('user_id')}/{session_id}/{recording_id}.{file_extension}"
            
            # Upload to Firebase Storage
            bucket = self.storage_client.bucket(self.bucket_name)
            blob = bucket.blob(file_path)
            
            # Read file content
            file_content = await file.read()
            
            # Upload with metadata
            blob.upload_from_string(
                file_content,
                content_type=file.content_type
            )
            
            # Make file accessible (configure permissions as needed)
            blob.make_public()
            
            # Create recording document
            recording_data = {
                "id": recording_id,
                "session_id": session_id,
                "user_id": metadata.get("user_id"),
                "file_path": file_path,
                "file_url": blob.public_url,
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size_bytes": len(file_content),
                "duration_seconds": metadata.get("duration_seconds"),
                "format": metadata.get("format", file_extension),
                "quality": metadata.get("quality", "720p"),
                "audio_only": metadata.get("audio_only", False),
                "transcript_available": False,
                "processing_status": "uploaded",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "metadata": metadata
            }
            
            # Save to Firestore
            await self.db.collection("recordings").document(recording_id).set(recording_data)
            
            # Publish event
            await self._publish_event("recording.uploaded", {
                "recording_id": recording_id,
                "session_id": session_id,
                "user_id": metadata.get("user_id"),
                "file_size": len(file_content)
            })
            
            logger.info("Recording uploaded successfully", recording_id=recording_id)
            return recording_data
            
        except Exception as e:
            logger.error("Recording upload failed", error=str(e))
            raise e
    
    async def get_recording(self, recording_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get recording by ID with user authorization"""
        try:
            doc = await self.db.collection("recordings").document(recording_id).get()
            
            if not doc.exists:
                return None
            
            recording = doc.to_dict()
            
            # Verify user ownership
            if recording.get("user_id") != user_id:
                return None
            
            return recording
            
        except Exception as e:
            logger.error("Recording retrieval failed", error=str(e))
            raise e
    
    async def get_session_recordings(self, session_id: str, user_id: str) -> List[Dict[str, Any]]:
        """Get all recordings for a session"""
        try:
            query = self.db.collection("recordings").where("session_id", "==", session_id).where("user_id", "==", user_id)
            docs = query.stream()
            
            recordings = []
            async for doc in docs:
                recording_data = doc.to_dict()
                recordings.append(recording_data)
            
            return sorted(recordings, key=lambda x: x.get("created_at", datetime.min), reverse=True)
            
        except Exception as e:
            logger.error("Session recordings retrieval failed", error=str(e))
            raise e
    
    async def get_user_recordings(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get all recordings for a user with pagination"""
        try:
            query = (self.db.collection("recordings")
                    .where("user_id", "==", user_id)
                    .order_by("created_at", direction=firestore.Query.DESCENDING)
                    .limit(limit)
                    .offset(offset))
            
            docs = query.stream()
            
            recordings = []
            async for doc in docs:
                recording_data = doc.to_dict()
                recordings.append(recording_data)
            
            return recordings
            
        except Exception as e:
            logger.error("User recordings retrieval failed", error=str(e))
            raise e
    
    async def process_recording(self, recording_id: str, user_id: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Process recording (transcription, analysis, etc.)"""
        try:
            # Get recording
            recording = await self.get_recording(recording_id, user_id)
            if not recording:
                raise ValueError("Recording not found")
            
            # Update processing status
            await self.db.collection("recordings").document(recording_id).update({
                "processing_status": "processing",
                "updated_at": datetime.utcnow()
            })
            
            # Start processing (placeholder - integrate with actual processing services)
            processing_result = {
                "status": "started",
                "processing_id": str(uuid.uuid4()),
                "options": options,
                "estimated_completion": datetime.utcnow() + timedelta(minutes=10)
            }
            
            # Publish processing event
            await self._publish_event("recording.processing_started", {
                "recording_id": recording_id,
                "user_id": user_id,
                "processing_options": options
            })
            
            # TODO: Integrate with actual transcription and analysis services
            # For now, simulate processing completion after a delay
            asyncio.create_task(self._simulate_processing_completion(recording_id, user_id))
            
            return processing_result
            
        except Exception as e:
            logger.error("Recording processing failed", error=str(e))
            raise e
    
    async def get_transcript(self, recording_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get recording transcript"""
        try:
            recording = await self.get_recording(recording_id, user_id)
            if not recording:
                return None
            
            if not recording.get("transcript_available"):
                return None
            
            # Get transcript from storage or database
            # Placeholder implementation
            transcript = {
                "recording_id": recording_id,
                "segments": [
                    {
                        "start_time": 0.0,
                        "end_time": 5.0,
                        "speaker": "interviewer",
                        "text": "Hello, thank you for joining us today. Can you tell me about yourself?"
                    },
                    {
                        "start_time": 5.5,
                        "end_time": 25.0,
                        "speaker": "candidate",
                        "text": "Thank you for having me. I'm a software engineer with 5 years of experience..."
                    }
                ],
                "summary": "Interview transcript with candidate discussing their background and experience.",
                "confidence_score": 0.95,
                "language": "en"
            }
            
            return transcript
            
        except Exception as e:
            logger.error("Transcript retrieval failed", error=str(e))
            raise e
    
    async def create_share_link(self, recording_id: str, user_id: str, share_type: str, expiry_hours: int) -> Dict[str, Any]:
        """Create shareable link for recording"""
        try:
            recording = await self.get_recording(recording_id, user_id)
            if not recording:
                raise ValueError("Recording not found")
            
            share_id = str(uuid.uuid4())
            expiry_time = datetime.utcnow() + timedelta(hours=expiry_hours)
            
            share_data = {
                "id": share_id,
                "recording_id": recording_id,
                "user_id": user_id,
                "share_type": share_type,
                "expiry_time": expiry_time,
                "created_at": datetime.utcnow(),
                "access_count": 0,
                "max_access_count": 100 if share_type == "public" else 10
            }
            
            # Save share link
            await self.db.collection("recording_shares").document(share_id).set(share_data)
            
            share_link = {
                "share_id": share_id,
                "url": f"https://travaia.com/shared/recording/{share_id}",
                "expiry_time": expiry_time,
                "share_type": share_type
            }
            
            return share_link
            
        except Exception as e:
            logger.error("Share link creation failed", error=str(e))
            raise e
    
    async def delete_recording(self, recording_id: str, user_id: str) -> bool:
        """Delete recording and associated files"""
        try:
            recording = await self.get_recording(recording_id, user_id)
            if not recording:
                return False
            
            # Delete from Firebase Storage
            try:
                bucket = self.storage_client.bucket(self.bucket_name)
                blob = bucket.blob(recording["file_path"])
                blob.delete()
            except Exception as e:
                logger.warning("Failed to delete file from storage", error=str(e))
            
            # Delete from Firestore
            await self.db.collection("recordings").document(recording_id).delete()
            
            # Delete associated share links
            shares_query = self.db.collection("recording_shares").where("recording_id", "==", recording_id)
            async for doc in shares_query.stream():
                await doc.reference.delete()
            
            # Publish deletion event
            await self._publish_event("recording.deleted", {
                "recording_id": recording_id,
                "user_id": user_id
            })
            
            logger.info("Recording deleted successfully", recording_id=recording_id)
            return True
            
        except Exception as e:
            logger.error("Recording deletion failed", error=str(e))
            raise e
    
    async def get_recording_analytics(self, recording_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get recording analytics and insights"""
        try:
            recording = await self.get_recording(recording_id, user_id)
            if not recording:
                return None
            
            # Placeholder analytics - integrate with actual analytics service
            analytics = {
                "recording_id": recording_id,
                "duration_analysis": {
                    "total_duration": recording.get("duration_seconds", 0),
                    "speaking_time": 180,
                    "silence_time": 20,
                    "speaking_ratio": 0.9
                },
                "speech_analysis": {
                    "average_pace": 150,  # words per minute
                    "filler_words_count": 5,
                    "confidence_level": 0.8,
                    "clarity_score": 0.85
                },
                "content_analysis": {
                    "key_topics": ["experience", "skills", "projects"],
                    "sentiment_score": 0.7,
                    "professionalism_score": 0.9
                },
                "recommendations": [
                    "Reduce use of filler words",
                    "Speak slightly slower for better clarity",
                    "Provide more specific examples"
                ]
            }
            
            return analytics
            
        except Exception as e:
            logger.error("Recording analytics retrieval failed", error=str(e))
            raise e
    
    async def _simulate_processing_completion(self, recording_id: str, user_id: str):
        """Simulate processing completion (for development)"""
        try:
            # Wait for simulated processing time
            await asyncio.sleep(10)
            
            # Update recording status
            await self.db.collection("recordings").document(recording_id).update({
                "processing_status": "completed",
                "transcript_available": True,
                "updated_at": datetime.utcnow()
            })
            
            # Publish completion event
            await self._publish_event("recording.processing_completed", {
                "recording_id": recording_id,
                "user_id": user_id
            })
            
        except Exception as e:
            logger.error("Processing completion simulation failed", error=str(e))
    
    async def _publish_event(self, event_type: str, data: Dict[str, Any]):
        """Publish event to Pub/Sub"""
        try:
            topic_path = self.publisher.topic_path(self.project_id, "interview-events")
            
            message_data = {
                "event_type": event_type,
                "timestamp": datetime.utcnow().isoformat(),
                "data": data
            }
            
            message_json = json.dumps(message_data)
            future = self.publisher.publish(topic_path, message_json.encode("utf-8"))
            
            # Don't wait for publish completion to avoid blocking
            logger.info("Event published", event_type=event_type)
            
        except Exception as e:
            logger.error("Event publishing failed", error=str(e))