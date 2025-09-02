"""
Session Service - Real-time interview session management
Handles interview sessions, WebRTC connections, and session state
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import firestore, pubsub_v1
import asyncio
import json

logger = structlog.get_logger(__name__)

class SessionService:
    """Enterprise interview session management service"""
    
    def __init__(self):
        # Initialize Firestore
        self.db = firestore.Client()
        self.sessions_collection = "interviews"
        self.attempts_collection = "interview_attempts"
        
        # Initialize Pub/Sub for event publishing
        try:
            self.publisher = pubsub_v1.PublisherClient()
            self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
            self.topic_path = self.publisher.topic_path(self.project_id, "interview-events")
            self.pubsub_enabled = True
        except Exception as e:
            logger.warning("Pub/Sub not available", error=str(e))
            self.pubsub_enabled = False
        
        logger.info("Session service initialized", pubsub_enabled=self.pubsub_enabled)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def create_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new interview session"""
        try:
            session_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            # Prepare session document
            session_doc = {
                "interview_id": session_id,
                "user_id": session_data["user_id"],
                "session_type": session_data.get("session_type", "voice"),  # voice, video, text
                "interview_type": session_data.get("interview_type", "general"),
                "job_application_id": session_data.get("job_application_id"),
                "status": "created",  # created, active, completed, failed
                "created_at": timestamp,
                "started_at": None,
                "ended_at": None,
                "duration_seconds": 0,
                "configuration": {
                    "language": session_data.get("language", "en"),
                    "difficulty": session_data.get("difficulty", "medium"),
                    "question_count": session_data.get("question_count", 5),
                    "time_limit_minutes": session_data.get("time_limit_minutes", 30)
                },
                "daily_room_url": None,  # Will be populated when Daily.co room is created
                "recording_url": None,
                "feedback": {},
                "analytics": {}
            }
            
            # Save to Firestore
            await asyncio.to_thread(
                self.db.collection(self.sessions_collection).document(session_id).set,
                session_doc
            )
            
            # Publish session creation event
            if self.pubsub_enabled:
                await self._publish_session_event(session_id, "session_created", session_data)
            
            logger.info("Interview session created", session_id=session_id, user_id=session_data["user_id"])
            return session_doc
            
        except Exception as e:
            logger.error("Session creation failed", error=str(e))
            raise Exception(f"Failed to create session: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def start_session(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Start interview session and create Daily.co room"""
        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                raise Exception("Session not found")
            
            session_data = doc.to_dict()
            
            # Verify user ownership
            if session_data.get("user_id") != user_id:
                raise Exception("Unauthorized access to session")
            
            if session_data.get("status") != "created":
                raise Exception(f"Session cannot be started. Current status: {session_data.get('status')}")
            
            # Create Daily.co room (placeholder - integrate with actual Daily.co API)
            daily_room_url = await self._create_daily_room(session_id)
            
            # Update session status
            start_time = datetime.utcnow()
            await asyncio.to_thread(
                doc_ref.update,
                {
                    "status": "active",
                    "started_at": start_time,
                    "daily_room_url": daily_room_url,
                    "updated_at": start_time
                }
            )
            
            # Create initial attempt record
            attempt_id = await self._create_attempt_record(session_id, user_id)
            
            # Publish session start event
            if self.pubsub_enabled:
                await self._publish_session_event(session_id, "session_started", {"daily_room_url": daily_room_url})
            
            logger.info("Interview session started", session_id=session_id, daily_room_url=daily_room_url)
            return {
                "session_id": session_id,
                "status": "active",
                "daily_room_url": daily_room_url,
                "attempt_id": attempt_id,
                "started_at": start_time.isoformat()
            }
            
        except Exception as e:
            logger.error("Session start failed", error=str(e), session_id=session_id)
            raise Exception(f"Failed to start session: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def end_session(self, session_id: str, user_id: str, session_results: Dict[str, Any] = None) -> bool:
        """End interview session and save results"""
        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                return False
            
            session_data = doc.to_dict()
            
            # Verify user ownership
            if session_data.get("user_id") != user_id:
                return False
            
            if session_data.get("status") != "active":
                logger.warning("Attempting to end non-active session", session_id=session_id, status=session_data.get("status"))
            
            # Calculate duration
            end_time = datetime.utcnow()
            start_time = session_data.get("started_at", end_time)
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            
            duration_seconds = int((end_time - start_time).total_seconds())
            
            # Update session with results
            update_data = {
                "status": "completed",
                "ended_at": end_time,
                "duration_seconds": duration_seconds,
                "updated_at": end_time
            }
            
            if session_results:
                update_data["feedback"] = session_results.get("feedback", {})
                update_data["analytics"] = session_results.get("analytics", {})
                update_data["recording_url"] = session_results.get("recording_url")
            
            await asyncio.to_thread(doc_ref.update, update_data)
            
            # Update attempt record
            await self._complete_attempt_record(session_id, session_results)
            
            # Publish session end event
            if self.pubsub_enabled:
                await self._publish_session_event(session_id, "session_completed", {
                    "duration_seconds": duration_seconds,
                    "results": session_results
                })
            
            logger.info("Interview session ended", session_id=session_id, duration_seconds=duration_seconds)
            return True
            
        except Exception as e:
            logger.error("Session end failed", error=str(e), session_id=session_id)
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_session(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID with user validation"""
        try:
            doc_ref = self.db.collection(self.sessions_collection).document(session_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                return None
            
            session_data = doc.to_dict()
            
            # Verify user ownership
            if session_data.get("user_id") != user_id:
                logger.warning("Unauthorized session access", session_id=session_id, user_id=user_id)
                return None
            
            return session_data
            
        except Exception as e:
            logger.error("Session retrieval failed", error=str(e), session_id=session_id)
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all sessions for a user"""
        try:
            query = (
                self.db.collection(self.sessions_collection)
                .where("user_id", "==", user_id)
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(limit)
            )
            
            docs = await asyncio.to_thread(query.get)
            sessions = [doc.to_dict() for doc in docs]
            
            logger.info("User sessions retrieved", user_id=user_id, count=len(sessions))
            return sessions
            
        except Exception as e:
            logger.error("User sessions retrieval failed", error=str(e), user_id=user_id)
            return []

    async def _create_daily_room(self, session_id: str) -> str:
        """Create Daily.co room for WebRTC session"""
        try:
            # TODO: Integrate with actual Daily.co API
            # For now, return a placeholder URL
            room_name = f"travaia-interview-{session_id[:8]}"
            daily_room_url = f"https://travaia.daily.co/{room_name}"
            
            logger.info("Daily.co room created (placeholder)", session_id=session_id, room_url=daily_room_url)
            return daily_room_url
            
        except Exception as e:
            logger.error("Daily.co room creation failed", error=str(e))
            raise Exception(f"Failed to create Daily.co room: {str(e)}")

    async def _create_attempt_record(self, session_id: str, user_id: str) -> str:
        """Create attempt record for session"""
        try:
            attempt_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            attempt_doc = {
                "attempt_id": attempt_id,
                "interview_id": session_id,
                "user_id": user_id,
                "attempt_number": 1,  # TODO: Calculate actual attempt number
                "started_at": timestamp,
                "status": "in_progress",
                "questions": [],
                "responses": [],
                "scores": {},
                "feedback": ""
            }
            
            await asyncio.to_thread(
                self.db.collection(self.attempts_collection).document(attempt_id).set,
                attempt_doc
            )
            
            logger.info("Attempt record created", attempt_id=attempt_id, session_id=session_id)
            return attempt_id
            
        except Exception as e:
            logger.error("Attempt record creation failed", error=str(e))
            return ""

    async def _complete_attempt_record(self, session_id: str, results: Dict[str, Any] = None):
        """Complete attempt record with results"""
        try:
            # Find the attempt record for this session
            query = (
                self.db.collection(self.attempts_collection)
                .where("interview_id", "==", session_id)
                .where("status", "==", "in_progress")
                .limit(1)
            )
            
            docs = await asyncio.to_thread(query.get)
            
            if docs:
                attempt_doc = docs[0]
                update_data = {
                    "status": "completed",
                    "completed_at": datetime.utcnow()
                }
                
                if results:
                    update_data.update({
                        "scores": results.get("scores", {}),
                        "feedback": results.get("feedback", ""),
                        "responses": results.get("responses", [])
                    })
                
                await asyncio.to_thread(attempt_doc.reference.update, update_data)
                logger.info("Attempt record completed", session_id=session_id)
            
        except Exception as e:
            logger.error("Attempt record completion failed", error=str(e))

    async def _publish_session_event(self, session_id: str, event_type: str, event_data: Dict[str, Any]):
        """Publish session event to Pub/Sub"""
        try:
            event = {
                "event_type": event_type,
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "data": event_data
            }
            
            message = json.dumps(event).encode("utf-8")
            future = self.publisher.publish(self.topic_path, message)
            await asyncio.to_thread(future.result)
            
            logger.info("Session event published", session_id=session_id, event_type=event_type)
            
        except Exception as e:
            logger.error("Event publishing failed", error=str(e))