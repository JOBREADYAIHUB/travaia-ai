"""
Job Service for TRAVAIA Application & Job Service
Handles favorite jobs operations with Firestore integration
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional

from models.dto import FavoriteJobCreateRequest
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from fastapi import HTTPException
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
import math

# Initialize logger
logger = structlog.get_logger(__name__)

class JobService:
    """Service class for job-related operations"""
    
    def __init__(self):
        """Initialize JobService with Firestore client"""
        # Use default credentials (Cloud Run service account)
        from google.auth import default
        credentials, _ = default()
        self.db = firestore.Client(credentials=credentials)
        self.favorite_jobs_collection = "favorite_jobs"
    
    def _convert_firestore_timestamps(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Firestore timestamp objects to ISO 8601 strings
        
        Args:
            data: Dictionary containing Firestore data
            
        Returns:
            Dictionary with converted timestamps
        """
        if not data:
            return data
            
        converted_data = data.copy()
        
        # Convert saved_date timestamp
        if "saved_date" in converted_data and hasattr(converted_data["saved_date"], "timestamp"):
            converted_data["saved_date"] = datetime.fromtimestamp(
                converted_data["saved_date"].timestamp()
            )
        elif "saved_date" in converted_data and isinstance(converted_data["saved_date"], datetime):
            # Already a datetime object
            pass
        
        return converted_data
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_favorite_jobs_paginated(
        self, 
        user_id: str, 
        page: int = 1, 
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Get paginated favorite jobs for a user
        
        Args:
            user_id: ID of the user
            page: Page number (1-based)
            limit: Number of items per page
            
        Returns:
            Dictionary containing favorite jobs list and pagination metadata
            
        Raises:
            Exception: If database operation fails
        """
        try:
            logger.info("Fetching user favorite jobs", 
                       user_id=user_id, 
                       page=page, 
                       limit=limit)
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Get total count for pagination from nested collection
            count_query = self.db.collection("users").document(user_id).collection(self.favorite_jobs_collection)
            
            # Execute count query
            count_docs = await asyncio.to_thread(count_query.get)
            total = len(count_docs)
            
            # Calculate pagination metadata
            total_pages = math.ceil(total / limit) if total > 0 else 1
            has_next = page < total_pages
            has_prev = page > 1
            
            # Get paginated results from nested collection
            query = (self.db.collection("users").document(user_id).collection(self.favorite_jobs_collection)
                    .order_by("saved_date", direction=firestore.Query.DESCENDING)
                    .limit(limit)
                    .offset(offset))
            
            # Execute paginated query
            docs = await asyncio.to_thread(query.get)
            
            # Convert documents to list
            favorite_jobs = []
            for doc in docs:
                job_data = doc.to_dict()
                job_data["favorite_job_id"] = doc.id
                
                # Convert Firestore timestamps
                job_data = self._convert_firestore_timestamps(job_data)
                
                favorite_jobs.append(job_data)
            
            # Prepare pagination metadata
            pagination_meta = {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            }
            
            logger.info("Favorite jobs retrieved successfully", 
                       user_id=user_id,
                       page=page,
                       limit=limit,
                       total=total,
                       returned_count=len(favorite_jobs))
            
            return {
                "favorite_jobs": favorite_jobs,
                "pagination": pagination_meta
            }
            
        except Exception as e:
            logger.error("Failed to fetch user favorite jobs", 
                        error=str(e), 
                        user_id=user_id,
                        page=page,
                        limit=limit)
            raise Exception(f"Failed to fetch favorite jobs: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def add_favorite_job_to_user(self, user_id: str, job_data: FavoriteJobCreateRequest) -> Dict[str, Any]:
        """
        Add a favorite job for a user
        
        Args:
            user_id: ID of the user
            job_data: Dictionary containing job_title, company_name, and link
            
        Returns:
            Dictionary containing the created favorite job data
            
        Raises:
            Exception: If database operation fails
        """
        try:
            logger.info("Adding favorite job for user", 
                       user_id=user_id,
                       job_title=job_data.job_title,
                       company_name=job_data.company_name)
            
            # Generate unique favorite job ID
            favorite_job_id = str(uuid.uuid4())
            
            # Get current timestamp for consistency
            current_time = firestore.SERVER_TIMESTAMP
            
            # Prepare favorite job data
            favorite_job_data = job_data.model_dump()
            favorite_job_data["user_id"] = user_id
            favorite_job_data["saved_date"] = current_time
            favorite_job_data["created_at"] = current_time
            favorite_job_data["updated_at"] = current_time
            
            # Add to nested collection under user
            doc_ref = self.db.collection("users").document(user_id).collection(self.favorite_jobs_collection).document(favorite_job_id)
            await asyncio.to_thread(doc_ref.set, favorite_job_data)
            
            # Retrieve the created document to get server timestamps
            created_doc = await asyncio.to_thread(doc_ref.get)
            created_data = created_doc.to_dict()
            created_data["favorite_job_id"] = favorite_job_id
            
            # Convert timestamps
            created_data = self._convert_firestore_timestamps(created_data)
            
            logger.info("Favorite job added successfully", 
                       user_id=user_id,
                       favorite_job_id=favorite_job_id,
                       job_title=job_data.job_title)
            
            return created_data
            
        except Exception as e:
            logger.error("Failed to add favorite job", 
                        error=str(e), 
                        user_id=user_id,
                        job_title=job_data.job_title)
            raise Exception(f"Failed to add favorite job: {str(e)}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def delete_favorite_job_for_user(self, user_id: str, favorite_job_id: str) -> bool:
        """
        Delete a favorite job for a specific user with ownership validation
        
        Args:
            user_id: ID of the user
            favorite_job_id: ID of the favorite job to delete
            
        Returns:
            True if successfully deleted, False if not found or not owned by user
            
        Raises:
            HTTPException: If user not authorized or job not found
            Exception: If database operation fails
        """
        try:
            logger.info("Deleting favorite job", 
                       user_id=user_id,
                       favorite_job_id=favorite_job_id)
            
            # Get document reference from nested collection
            doc_ref = self.db.collection("users").document(user_id).collection(self.favorite_jobs_collection).document(favorite_job_id)
            
            # Check if document exists and verify ownership
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                logger.warning("Favorite job not found", 
                             favorite_job_id=favorite_job_id, 
                             user_id=user_id)
                return False
            
            job_data = doc.to_dict()
            
            # Verify user ownership
            if job_data.get("user_id") != user_id:
                logger.warning("Unauthorized delete attempt", 
                             favorite_job_id=favorite_job_id, 
                             user_id=user_id,
                             owner_id=job_data.get("user_id"))
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to delete this favorite job"
                )
            
            # Delete the document
            await asyncio.to_thread(doc_ref.delete)
            
            logger.info("Favorite job deleted successfully", 
                       user_id=user_id,
                       favorite_job_id=favorite_job_id,
                       job_title=job_data.get("job_title"))
            
            return True
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error("Failed to delete favorite job", 
                        error=str(e), 
                        user_id=user_id,
                        favorite_job_id=favorite_job_id)
            raise Exception(f"Failed to delete favorite job: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def remove_favorite_job(self, user_id: str, favorite_job_id: str) -> bool:
        """
        Remove a job from user's favorites
        
        Args:
            user_id: ID of the user
            favorite_job_id: ID of the favorite job to remove
            
        Returns:
            True if successfully removed, False if not found
            
        Raises:
            HTTPException: If user not authorized or job not found
            Exception: If database operation fails
        """
        try:
            logger.info("Removing favorite job", 
                       user_id=user_id,
                       favorite_job_id=favorite_job_id)
            
            # Get document reference from nested collection
            doc_ref = self.db.collection("users").document(user_id).collection(self.favorite_jobs_collection).document(favorite_job_id)
            
            # Check if document exists and verify ownership
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                logger.warning("Favorite job not found", 
                             favorite_job_id=favorite_job_id, 
                             user_id=user_id)
                raise HTTPException(
                    status_code=404,
                    detail=f"Favorite job with ID {favorite_job_id} not found"
                )
            
            job_data = doc.to_dict()
            
            # Verify user ownership
            if job_data.get("user_id") != user_id:
                logger.warning("Unauthorized access attempt", 
                             favorite_job_id=favorite_job_id, 
                             user_id=user_id,
                             owner_id=job_data.get("user_id"))
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to remove this favorite job"
                )
            
            # Delete the document
            await asyncio.to_thread(doc_ref.delete)
            
            logger.info("Favorite job removed successfully", 
                       user_id=user_id,
                       favorite_job_id=favorite_job_id)
            
            return True
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error("Failed to remove favorite job", 
                        error=str(e), 
                        user_id=user_id,
                        favorite_job_id=favorite_job_id)
            raise Exception(f"Failed to remove favorite job: {str(e)}")
