"""
Interview Service for TRAVAIA Interview Session Service
Handles interview question sets and related operations with Firestore integration
"""

import asyncio
import asyncio
import random
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from google.cloud import firestore
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog
from shared.database_pool import get_firestore_client
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

# Import models from local models file
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from models import InterviewQuestionSet, Interview, InterviewAttempt, PaginationMeta

# Initialize logger
logger = structlog.get_logger(__name__)

class InterviewService:
    """Service class for interview-related operations"""
    
    def __init__(self):
        """Initialize InterviewService with Firestore client"""
        self.db = firestore.Client()
        self.interview_questions_collection = "interview_questions"
    
    def _convert_firestore_timestamps(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Firestore timestamp objects to datetime objects
        
        Args:
            data: Dictionary containing Firestore data
            
        Returns:
            Dictionary with converted timestamps
        """
        if not data:
            return data
            
        converted_data = data.copy()
        
        # Convert timestamp fields
        timestamp_fields = ["created_at", "updated_at"]
        for field in timestamp_fields:
            if field in converted_data and hasattr(converted_data[field], "timestamp"):
                converted_data[field] = datetime.fromtimestamp(
                    converted_data[field].timestamp()
                )
            elif field in converted_data and isinstance(converted_data[field], datetime):
                # Already a datetime object
                pass
        
        return converted_data
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_question_sets_paginated(
        self, 
        user_id: str, 
        page: int = 1, 
        limit: int = 10
    ) -> Tuple[List[InterviewQuestionSet], PaginationMeta]:
        """
        Get paginated interview question sets for a user
        
        Args:
            user_id: ID of the user
            page: Page number (1-based)
            limit: Number of items per page
            
        Returns:
            Tuple containing list of InterviewQuestionSet objects and PaginationMeta
            
        Raises:
            Exception: If database operation fails
        """
        try:
            logger.info("Fetching user interview question sets", 
                       user_id=user_id, 
                       page=page, 
                       limit=limit)
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get total count for pagination from nested collection
            count_query = self.db.collection("users").document(user_id).collection(self.interview_questions_collection)
            
            # Execute count query
            count_docs = await asyncio.to_thread(count_query.get)
            total = len(count_docs)
            
            # Calculate pagination metadata
            total_pages = math.ceil(total / limit) if total > 0 else 1
            has_next = page < total_pages
            has_prev = page > 1
            
            # Get paginated results from nested collection
            query = (self.db.collection("users").document(user_id).collection(self.interview_questions_collection)
                    .order_by("created_at", direction=firestore.Query.DESCENDING)
                    .limit(limit)
                    .offset(offset))
            
            # Execute paginated query
            docs = await asyncio.to_thread(query.get)
            
            # Convert documents to InterviewQuestionSet objects
            question_sets = []
            for doc in docs:
                question_set_data = doc.to_dict()
                question_set_data["question_set_id"] = doc.id
                
                # Convert Firestore timestamps
                question_set_data = self._convert_firestore_timestamps(question_set_data)
                
                # Create InterviewQuestionSet object
                question_set = InterviewQuestionSet(**question_set_data)
                question_sets.append(question_set)
            
            # Create pagination metadata
            pagination_meta = PaginationMeta(
                page=page,
                limit=limit,
                total=total,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
            
            logger.info("Interview question sets retrieved successfully", 
                       user_id=user_id,
                       page=page,
                       limit=limit,
                       total=total,
                       returned_count=len(question_sets))
            
            return question_sets, pagination_meta
            
        except Exception as e:
            logger.error("Failed to fetch user interview question sets", 
                        error=str(e), 
                        user_id=user_id,
                        page=page,
                        limit=limit)
            raise Exception(f"Failed to fetch interview question sets: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def create_question_set(
        self, 
        user_id: str, 
        name: str, 
        language: str, 
        questions: List[str]
    ) -> InterviewQuestionSet:
        """
        Create a new interview question set
        
        Args:
            user_id: ID of the user
            name: Name of the question set
            language: Language of the questions
            questions: List of question strings
            
        Returns:
            Created InterviewQuestionSet object
            
        Raises:
            Exception: If database operation fails
        """
        try:
            logger.info("Creating interview question set", 
                       user_id=user_id,
                       name=name,
                       language=language,
                       question_count=len(questions))
            
            # Generate unique question set ID
            question_set_id = str(uuid.uuid4())
            
            # Get current timestamp for consistency
            current_time = firestore.SERVER_TIMESTAMP
            
            # Prepare question set data
            question_set_data = {
                "user_id": user_id,
                "name": name,
                "language": language,
                "questions": questions,
                "created_at": current_time,
                "updated_at": current_time
            }
            
            # Add to nested collection under user
            doc_ref = self.db.collection("users").document(user_id).collection(self.interview_questions_collection).document(question_set_id)
            await asyncio.to_thread(doc_ref.set, question_set_data)
            
            # Retrieve the created document to get server timestamps
            created_doc = await asyncio.to_thread(doc_ref.get)
            created_data = created_doc.to_dict()
            created_data["question_set_id"] = question_set_id
            
            # Convert timestamps
            created_data = self._convert_firestore_timestamps(created_data)
            
            # Create InterviewQuestionSet object
            question_set = InterviewQuestionSet(**created_data)
            
            logger.info("Interview question set created successfully", 
                       user_id=user_id,
                       question_set_id=question_set_id,
                       name=name)
            
            return question_set
            
        except Exception as e:
            logger.error("Failed to create interview question set", 
                        error=str(e), 
                        user_id=user_id,
                        name=name)
            raise Exception(f"Failed to create interview question set: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def update_question_set(self, user_id: str, question_set_id: str, update_data: Dict[str, Any]) -> InterviewQuestionSet:
        """
        Update an existing interview question set
        
        Args:
            user_id: ID of the user updating the question set
            question_set_id: ID of the question set to update
            update_data: Dictionary containing fields to update
            
        Returns:
            InterviewQuestionSet: Updated question set data
            
        Raises:
            ValueError: If question set not found or user doesn't own it
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                # Use nested collection under user
                doc_ref = db.collection("users").document(user_id).collection("interview_questions").document(question_set_id)
                
                # First, check if document exists and user owns it
                doc_snapshot = await doc_ref.get()
                
                if not doc_snapshot.exists:
                    logger.error("Question set not found for update", 
                               question_set_id=question_set_id, 
                               user_id=user_id)
                    raise ValueError(f"Question set with ID {question_set_id} not found")
                
                existing_data = doc_snapshot.to_dict()
                
                # Verify user ownership
                if existing_data.get("user_id") != user_id:
                    logger.error("User attempted to update question set they don't own", 
                               question_set_id=question_set_id, 
                               user_id=user_id,
                               owner_id=existing_data.get("user_id"))
                    raise ValueError(f"Permission denied: User {user_id} does not own question set {question_set_id}")
                
                # Prepare update data with timestamp
                update_fields = {**update_data}
                update_fields["updated_at"] = firestore.SERVER_TIMESTAMP
                
                # Remove None values to avoid overwriting with null
                update_fields = {k: v for k, v in update_fields.items() if v is not None}
                
                # Update the document
                await doc_ref.update(update_fields)
                
                # Get the updated document
                updated_doc = await doc_ref.get()
                updated_data = updated_doc.to_dict()
                
                # Convert Firestore timestamps to datetime objects
                if "created_at" in updated_data and hasattr(updated_data["created_at"], "timestamp"):
                    updated_data["created_at"] = datetime.fromtimestamp(updated_data["created_at"].timestamp())
                if "updated_at" in updated_data and hasattr(updated_data["updated_at"], "timestamp"):
                    updated_data["updated_at"] = datetime.fromtimestamp(updated_data["updated_at"].timestamp())
                
                # Create InterviewQuestionSet object
                question_set = InterviewQuestionSet(**updated_data)
                
                logger.info("Interview question set updated successfully", 
                           question_set_id=question_set_id,
                           user_id=user_id,
                           updated_fields=list(update_data.keys()),
                           attempt=attempt + 1)
                
                return question_set
                
            except ValueError:
                # Don't retry validation errors or permission errors
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore update attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 question_set_id=question_set_id,
                                 user_id=user_id)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to update interview question set after all retries", 
                               error=str(e),
                               question_set_id=question_set_id,
                               user_id=user_id,
                               max_retries=max_retries)
                    raise Exception(f"Failed to update question set after {max_retries} attempts: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def delete_question_set(self, user_id: str, question_set_id: str) -> None:
        """
        Delete an interview question set with ownership validation
        
        Args:
            user_id: ID of the user
            question_set_id: ID of the question set to delete
            
        Returns:
            None
            
        Raises:
            ValueError: If question set not found or user doesn't own it
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                # Use nested collection under user
                doc_ref = db.collection("users").document(user_id).collection("interview_questions").document(question_set_id)
                
                # First, check if document exists and user owns it
                doc_snapshot = await doc_ref.get()
                
                if not doc_snapshot.exists:
                    logger.error("Question set not found for deletion", 
                               question_set_id=question_set_id, 
                               user_id=user_id)
                    raise ValueError(f"Question set with ID {question_set_id} not found")
                
                existing_data = doc_snapshot.to_dict()
                
                # Verify user ownership
                if existing_data.get("user_id") != user_id:
                    logger.error("User attempted to delete question set they don't own", 
                               question_set_id=question_set_id, 
                               user_id=user_id,
                               owner_id=existing_data.get("user_id"))
                    raise ValueError(f"Permission denied: User {user_id} does not own question set {question_set_id}")
                
                # Delete the document
                await doc_ref.delete()
                
                logger.info("Interview question set deleted successfully", 
                           question_set_id=question_set_id,
                           user_id=user_id,
                           attempt=attempt + 1)
                
                return
                
            except ValueError:
                # Don't retry validation errors or permission errors
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore delete attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 question_set_id=question_set_id,
                                 user_id=user_id)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to delete interview question set after all retries", 
                               error=str(e),
                               question_set_id=question_set_id,
                               user_id=user_id,
                               max_retries=max_retries)
                    raise Exception(f"Failed to delete question set after {max_retries} attempts: {str(e)}")
    
    async def get_user_interviews_paginated(self, user_id: str, page: int = 1, limit: int = 10) -> Tuple[List[Dict], Dict]:
        """
        Get paginated list of interviews for a specific user
        
        Args:
            user_id: ID of the user
            page: Page number (1-based)
            limit: Number of interviews per page
            
        Returns:
            Tuple containing list of interview dictionaries and pagination metadata
            
        Raises:
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                # Use nested collection under user for interviews
                
                # Build query with user filter and ordering
                query = db.collection("users").document(user_id).collection("interviews").order_by("created_at", direction=firestore.Query.DESCENDING)
                
                # Calculate offset for pagination
                offset = (page - 1) * limit
                
                # Get total count for pagination metadata
                total_query = db.collection("users").document(user_id).collection("interviews")
                total_docs = await total_query.count().get()
                total_interviews = total_docs[0][0].value if total_docs else 0
                
                # Apply pagination
                paginated_query = query.offset(offset).limit(limit)
                docs = await paginated_query.get()
                
                # Convert documents to dictionaries
                interviews = []
                for doc in docs:
                    interview_data = doc.to_dict()
                    interview_data["interview_id"] = doc.id
                    
                    # Convert Firestore timestamps to datetime objects and then to ISO strings
                    if "created_at" in interview_data and hasattr(interview_data["created_at"], "timestamp"):
                        interview_data["created_at"] = datetime.fromtimestamp(interview_data["created_at"].timestamp()).isoformat()
                    if "updated_at" in interview_data and hasattr(interview_data["updated_at"], "timestamp"):
                        interview_data["updated_at"] = datetime.fromtimestamp(interview_data["updated_at"].timestamp()).isoformat()
                    
                    interviews.append(interview_data)
                
                # Calculate pagination metadata
                total_pages = (total_interviews + limit - 1) // limit  # Ceiling division
                has_next = page < total_pages
                has_prev = page > 1
                
                pagination_meta = {
                    "page": page,
                    "limit": limit,
                    "total": total_interviews,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev
                }
                
                logger.info("Retrieved user interviews successfully", 
                           user_id=user_id,
                           page=page,
                           limit=limit,
                           total_interviews=total_interviews,
                           returned_count=len(interviews),
                           attempt=attempt + 1)
                
                return interviews, pagination_meta
                
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore query attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 user_id=user_id,
                                 page=page,
                                 limit=limit)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to retrieve user interviews after all retries", 
                               error=str(e),
                               user_id=user_id,
                               page=page,
                               limit=limit,
                               max_retries=max_retries)
                    raise Exception(f"Failed to retrieve interviews after {max_retries} attempts: {str(e)}")
    
    async def create_interview_session(self, user_id: str, interview_data: Dict[str, Any]) -> Interview:
        """
        Create a new interview session
        
        Args:
            user_id: ID of the user creating the interview
            interview_data: Dictionary containing interview data from InterviewCreateRequest
            
        Returns:
            Interview: Created interview object
            
        Raises:
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Generate unique interview ID
                interview_id = str(uuid.uuid4())
                
                # Get Firestore client
                db = get_firestore_client()
                # Use nested collection under user for interviews
                doc_ref = db.collection("users").document(user_id).collection("interviews").document(interview_id)
                
                # Prepare interview document data
                interview_doc = {
                    "interview_id": interview_id,
                    "user_id": user_id,
                    "application_id": interview_data["application_id"],
                    "interview_type": interview_data["interview_type"],
                    "configuration": interview_data["configuration"],
                    "status": interview_data["status"],
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }
                
                # Create the document in Firestore
                await doc_ref.set(interview_doc)
                
                # Get the created document to return with proper timestamps
                created_doc = await doc_ref.get()
                created_data = created_doc.to_dict()
                
                # Convert Firestore timestamps to datetime objects
                if "created_at" in created_data and hasattr(created_data["created_at"], "timestamp"):
                    created_data["created_at"] = datetime.fromtimestamp(created_data["created_at"].timestamp())
                if "updated_at" in created_data and hasattr(created_data["updated_at"], "timestamp"):
                    created_data["updated_at"] = datetime.fromtimestamp(created_data["updated_at"].timestamp())
                
                # Create Interview object
                interview = Interview(**created_data)
                
                logger.info("Interview session created successfully", 
                           interview_id=interview_id,
                           user_id=user_id,
                           interview_type=interview_data["interview_type"],
                           status=interview_data["status"],
                           attempt=attempt + 1)
                
                return interview
                
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore create attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 user_id=user_id,
                                 interview_type=interview_data.get("interview_type"))
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to create interview session after all retries", 
                               error=str(e),
                               user_id=user_id,
                               interview_type=interview_data.get("interview_type"),
                               max_retries=max_retries)
                    raise Exception(f"Failed to create interview session after {max_retries} attempts: {str(e)}")
    
    async def get_interview_by_id(self, user_id: str, interview_id: str) -> Optional[Interview]:
        """
        Retrieve a single interview by ID with user ownership validation
        
        Args:
            user_id: ID of the user requesting the interview
            interview_id: ID of the interview to retrieve
            
        Returns:
            Interview: Interview object if found and owned by user
            
        Raises:
            ValueError: If interview not found or user doesn't own it
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                # Use nested collection under user for interviews
                doc_ref = db.collection("users").document(user_id).collection("interviews").document(interview_id)
                
                logger.info("Retrieving interview by ID", 
                           user_id=user_id,
                           interview_id=interview_id,
                           attempt=attempt + 1)
                
                # Get the document
                doc = await doc_ref.get()
                
                if not doc.exists:
                    logger.warning("Interview not found", 
                                 user_id=user_id,
                                 interview_id=interview_id)
                    raise ValueError(f"Interview with ID {interview_id} not found")
                
                # Get document data
                interview_data = doc.to_dict()
                
                # Validate user ownership
                if interview_data.get("user_id") != user_id:
                    logger.warning("User does not own interview", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 owner_id=interview_data.get("user_id"))
                    raise ValueError(f"User {user_id} does not have permission to access interview {interview_id}")
                
                # Convert Firestore timestamps to datetime objects
                if "created_at" in interview_data and hasattr(interview_data["created_at"], "timestamp"):
                    interview_data["created_at"] = datetime.fromtimestamp(interview_data["created_at"].timestamp())
                if "updated_at" in interview_data and hasattr(interview_data["updated_at"], "timestamp"):
                    interview_data["updated_at"] = datetime.fromtimestamp(interview_data["updated_at"].timestamp())
                
                # Create Interview object
                interview = Interview(**interview_data)
                
                logger.info("Interview retrieved successfully", 
                           user_id=user_id,
                           interview_id=interview_id,
                           interview_type=interview.interview_type,
                           status=interview.status,
                           attempt=attempt + 1)
                
                return interview
                
            except ValueError:
                # Re-raise ValueError (not found or permission denied) without retry
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore get attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 user_id=user_id,
                                 interview_id=interview_id)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to retrieve interview after all retries", 
                               error=str(e),
                               user_id=user_id,
                               interview_id=interview_id,
                               max_retries=max_retries)
                    raise Exception(f"Failed to retrieve interview after {max_retries} attempts: {str(e)}")
    
    async def start_interview_attempt(self, user_id: str, interview_id: str) -> Dict[str, Any]:
        """
        Start a new interview attempt for the given interview
        
        Args:
            user_id: ID of the user starting the attempt
            interview_id: ID of the interview to create an attempt for
            
        Returns:
            Dict containing the newly created attempt data
            
        Raises:
            ValueError: If interview not found or user doesn't own it
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                
                # First, verify the interview exists and user owns it
                interview_ref = db.collection("users").document(user_id).collection("interviews").document(interview_id)
                interview_doc = await interview_ref.get()
                
                if not interview_doc.exists:
                    logger.warning("Interview not found for attempt creation", 
                                 user_id=user_id,
                                 interview_id=interview_id)
                    raise ValueError(f"Interview with ID {interview_id} not found")
                
                interview_data = interview_doc.to_dict()
                
                # Validate user ownership
                if interview_data.get("user_id") != user_id:
                    logger.warning("User does not own interview for attempt creation", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 owner_id=interview_data.get("user_id"))
                    raise ValueError(f"User {user_id} does not have permission to create attempts for interview {interview_id}")
                
                # Generate unique attempt ID
                attempt_id = uuid.uuid4().hex
                
                # Prepare attempt document data
                attempt_data = {
                    "attempt_id": attempt_id,
                    "user_id": user_id,
                    "interview_id": interview_id,
                    "start_time": firestore.SERVER_TIMESTAMP,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "status": "in_progress",
                    "score": 0,
                    "end_time": None,
                    "recording_url": "",
                    "feedback_report_id": ""
                }
                
                logger.info("Creating interview attempt", 
                           user_id=user_id,
                           interview_id=interview_id,
                           attempt_id=attempt_id,
                           attempt=attempt + 1)
                
                # Create the attempt document in the sub-collection
                attempts_ref = interview_ref.collection("attempts")
                attempt_doc_ref = attempts_ref.document(attempt_id)
                await attempt_doc_ref.set(attempt_data)
                
                # Get the created document to return with proper timestamps
                created_doc = await attempt_doc_ref.get()
                created_data = created_doc.to_dict()
                
                # Convert Firestore timestamps to datetime objects for response
                if "start_time" in created_data and hasattr(created_data["start_time"], "timestamp"):
                    created_data["start_time"] = datetime.fromtimestamp(created_data["start_time"].timestamp())
                if "created_at" in created_data and hasattr(created_data["created_at"], "timestamp"):
                    created_data["created_at"] = datetime.fromtimestamp(created_data["created_at"].timestamp())
                
                logger.info("Interview attempt created successfully", 
                           user_id=user_id,
                           interview_id=interview_id,
                           attempt_id=attempt_id,
                           status=created_data["status"],
                           attempt=attempt + 1)
                
                return created_data
                
            except ValueError:
                # Re-raise ValueError (not found or permission denied) without retry
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore attempt creation attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 user_id=user_id,
                                 interview_id=interview_id)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to create interview attempt after all retries", 
                               error=str(e),
                               user_id=user_id,
                               interview_id=interview_id,
                               max_retries=max_retries)
                    raise Exception(f"Failed to create interview attempt after {max_retries} attempts: {str(e)}")
    
    async def update_interview_attempt(self, user_id: str, interview_id: str, attempt_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing interview attempt
        
        Args:
            user_id: ID of the user updating the attempt
            interview_id: ID of the interview containing the attempt
            attempt_id: ID of the attempt to update
            update_data: Dictionary containing fields to update
            
        Returns:
            Dict containing the updated attempt data
            
        Raises:
            ValueError: If interview/attempt not found or user doesn't own it
            Exception: If Firestore operation fails
        """
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Get Firestore client
                db = get_firestore_client()
                
                # First, verify the interview exists and user owns it
                interview_ref = db.collection("users").document(user_id).collection("interviews").document(interview_id)
                interview_doc = await interview_ref.get()
                
                if not interview_doc.exists:
                    logger.warning("Interview not found for attempt update", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 attempt_id=attempt_id)
                    raise ValueError(f"Interview with ID {interview_id} not found")
                
                interview_data = interview_doc.to_dict()
                
                # Validate user ownership of interview
                if interview_data.get("user_id") != user_id:
                    logger.warning("User does not own interview for attempt update", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 attempt_id=attempt_id,
                                 owner_id=interview_data.get("user_id"))
                    raise ValueError(f"User {user_id} does not have permission to update attempts for interview {interview_id}")
                
                # Get the specific attempt document
                attempts_ref = interview_ref.collection("attempts")
                attempt_doc_ref = attempts_ref.document(attempt_id)
                attempt_doc = await attempt_doc_ref.get()
                
                if not attempt_doc.exists:
                    logger.warning("Attempt not found for update", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 attempt_id=attempt_id)
                    raise ValueError(f"Attempt with ID {attempt_id} not found in interview {interview_id}")
                
                attempt_data = attempt_doc.to_dict()
                
                # Validate user ownership of attempt (double-check)
                if attempt_data.get("user_id") != user_id:
                    logger.warning("User does not own attempt for update", 
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 attempt_id=attempt_id,
                                 attempt_owner_id=attempt_data.get("user_id"))
                    raise ValueError(f"User {user_id} does not have permission to update attempt {attempt_id}")
                
                # Prepare update data - only include non-None fields
                update_fields = {}
                for key, value in update_data.items():
                    if value is not None:
                        if key == "end_time" and isinstance(value, datetime):
                            # Convert datetime to Firestore timestamp
                            update_fields[key] = value
                        else:
                            update_fields[key] = value
                
                # Only proceed if there are fields to update
                if not update_fields:
                    logger.info("No fields to update in attempt", 
                               user_id=user_id,
                               interview_id=interview_id,
                               attempt_id=attempt_id)
                    # Return current data if no updates
                    return attempt_data
                
                logger.info("Updating interview attempt", 
                           user_id=user_id,
                           interview_id=interview_id,
                           attempt_id=attempt_id,
                           update_fields=list(update_fields.keys()),
                           attempt=attempt + 1)
                
                # Update the attempt document
                await attempt_doc_ref.update(update_fields)
                
                # Get the updated document to return
                updated_doc = await attempt_doc_ref.get()
                updated_data = updated_doc.to_dict()
                
                # Convert Firestore timestamps to datetime objects for response
                if "start_time" in updated_data and hasattr(updated_data["start_time"], "timestamp"):
                    updated_data["start_time"] = datetime.fromtimestamp(updated_data["start_time"].timestamp())
                if "created_at" in updated_data and hasattr(updated_data["created_at"], "timestamp"):
                    updated_data["created_at"] = datetime.fromtimestamp(updated_data["created_at"].timestamp())
                if "end_time" in updated_data and updated_data["end_time"] and hasattr(updated_data["end_time"], "timestamp"):
                    updated_data["end_time"] = datetime.fromtimestamp(updated_data["end_time"].timestamp())
                
                logger.info("Interview attempt updated successfully", 
                           user_id=user_id,
                           interview_id=interview_id,
                           attempt_id=attempt_id,
                           updated_fields=list(update_fields.keys()),
                           status=updated_data.get("status"),
                           score=updated_data.get("score"),
                           attempt=attempt + 1)
                
                return updated_data
                
            except ValueError:
                # Re-raise ValueError (not found or permission denied) without retry
                raise
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(f"Firestore attempt update attempt {attempt + 1} failed, retrying in {delay:.2f}s", 
                                 error=str(e),
                                 user_id=user_id,
                                 interview_id=interview_id,
                                 attempt_id=attempt_id)
                    await asyncio.sleep(delay)
                else:
                    logger.error("Failed to update interview attempt after all retries", 
                               error=str(e),
                               user_id=user_id,
                               interview_id=interview_id,
                               attempt_id=attempt_id,
                               max_retries=max_retries)
                    raise Exception(f"Failed to update interview attempt after {max_retries} attempts: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_interview_attempts_paginated(self, user_id: str, interview_id: str, page: int = 1, limit: int = 10) -> Tuple[List[Dict[str, Any]], PaginationMeta]:
        """
        Get paginated interview attempts for a specific interview with user ownership validation
        
        Args:
            user_id: ID of the user making the request
            interview_id: ID of the interview to get attempts for
            page: Page number (1-based)
            limit: Number of attempts per page
            
        Returns:
            Tuple of (attempts_list, pagination_metadata)
            
        Raises:
            ValueError: If user doesn't own the interview or interview not found
            Exception: For database errors
        """
        logger.info("Getting paginated interview attempts", 
                   user_id=user_id, 
                   interview_id=interview_id, 
                   page=page, 
                   limit=limit)
        
        try:
            # First, verify user owns the interview
            interview_ref = self.db.collection("users").document(user_id).collection("interviews").document(interview_id)
            interview_doc = interview_ref.get()
            
            if not interview_doc.exists:
                logger.warning("Interview not found", 
                             user_id=user_id, 
                             interview_id=interview_id)
                raise ValueError(f"Interview with ID {interview_id} not found.")
            
            interview_data = interview_doc.to_dict()
            if interview_data.get("user_id") != user_id:
                logger.warning("Permission denied: User does not own interview", 
                             user_id=user_id, 
                             interview_id=interview_id, 
                             interview_owner=interview_data.get("user_id"))
                raise ValueError("Permission denied: User does not own this interview.")
            
            # Get attempts sub-collection reference
            attempts_ref = interview_ref.collection("attempts")
            
            # Get total count for pagination
            logger.info("Getting total attempts count", 
                       user_id=user_id, 
                       interview_id=interview_id)
            
            # Count total attempts
            count_query = attempts_ref.count()
            count_result = count_query.get()
            total_attempts = count_result[0][0].value if count_result and count_result[0] else 0
            
            # Calculate pagination
            offset = (page - 1) * limit
            total_pages = (total_attempts + limit - 1) // limit if total_attempts > 0 else 1
            has_next = page < total_pages
            has_prev = page > 1
            
            logger.info("Pagination calculated", 
                       user_id=user_id, 
                       interview_id=interview_id, 
                       total_attempts=total_attempts, 
                       total_pages=total_pages, 
                       offset=offset)
            
            # Query attempts with pagination and sorting
            attempts_query = (attempts_ref
                            .order_by("created_at", direction=firestore.Query.DESCENDING)
                            .offset(offset)
                            .limit(limit))
            
            attempts_docs = attempts_query.stream()
            
            # Convert documents to InterviewAttempt objects
            attempts_list = []
            for doc in attempts_docs:
                attempt_data = doc.to_dict()
                attempt_data["attempt_id"] = doc.id
                
                # Convert Firestore timestamps to datetime objects
                converted_data = self._convert_firestore_timestamps(attempt_data)
                
                # Ensure all required fields are present with defaults
                converted_data.setdefault("user_id", user_id)
                converted_data.setdefault("interview_id", interview_id)
                converted_data.setdefault("status", "in_progress")
                converted_data.setdefault("score", 0)
                
                attempts_list.append(converted_data)
            
            # Create pagination metadata
            pagination_meta = PaginationMeta(
                page=page,
                limit=limit,
                total=total_attempts,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )
            
            logger.info("Successfully retrieved paginated interview attempts", 
                       user_id=user_id, 
                       interview_id=interview_id, 
                       attempts_count=len(attempts_list), 
                       page=page, 
                       total=total_attempts)
            
            return attempts_list, pagination_meta
            
        except ValueError:
            # Re-raise ValueError (permission/not found errors)
            raise
        except Exception as e:
            logger.error("Failed to get paginated interview attempts", 
                        error=str(e), 
                        user_id=user_id, 
                        interview_id=interview_id, 
                        page=page, 
                        limit=limit)
            raise Exception(f"Database error while retrieving interview attempts: {str(e)}")
