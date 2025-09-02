"""
Report Service - AI report management and generation
Handles AI-generated reports with cross-referencing and storage
"""

import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import firestore
import asyncio
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from models import AIReport, AIReportContent, PaginationMeta

logger = structlog.get_logger(__name__)

class ReportService:
    """Enterprise AI report management service"""
    
    def __init__(self):
        # Initialize Firestore
        self.db = firestore.Client()
        self.reports_collection = "ai_reports"
        
        logger.info("Report service initialized")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def create_report(self, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new AI report with cross-referencing"""
        try:
            report_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            # Prepare report document
            report_doc = {
                "report_id": report_id,
                "user_id": report_data["user_id"],
                "report_type": report_data["report_type"],  # job_fit, interview_feedback, etc.
                "title": report_data["title"],
                "content": report_data["content"],
                "metadata": report_data.get("metadata", {}),
                "references": report_data.get("references", {}),  # Cross-references
                "created_at": timestamp,
                "updated_at": timestamp
            }
            
            # Save to Firestore
            await asyncio.to_thread(
                self.db.collection(self.reports_collection).document(report_id).set,
                report_doc
            )
            
            logger.info("Report created", report_id=report_id, user_id=report_data["user_id"], 
                       type=report_data["report_type"])
            return report_doc
            
        except Exception as e:
            logger.error("Report creation failed", error=str(e))
            raise Exception(f"Failed to create report: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_report(self, report_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get report by ID with user validation"""
        try:
            doc_ref = self.db.collection(self.reports_collection).document(report_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                return None
            
            report_data = doc.to_dict()
            
            # Verify user ownership
            if report_data.get("user_id") != user_id:
                logger.warning("Unauthorized report access", report_id=report_id, user_id=user_id)
                return None
            
            return report_data
            
        except Exception as e:
            logger.error("Report retrieval failed", error=str(e), report_id=report_id)
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_reports(self, user_id: str, report_type: Optional[str] = None, 
                             limit: int = 50) -> List[Dict[str, Any]]:
        """Get all reports for a user, optionally filtered by type"""
        try:
            query = self.db.collection(self.reports_collection).where("user_id", "==", user_id)
            
            if report_type:
                query = query.where("report_type", "==", report_type)
            
            query = query.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = await asyncio.to_thread(query.get)
            reports = [doc.to_dict() for doc in docs]
            
            logger.info("Reports retrieved", user_id=user_id, count=len(reports), 
                       type=report_type)
            return reports
            
        except Exception as e:
            logger.error("Reports retrieval failed", error=str(e), user_id=user_id)
            return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def update_report_references(self, report_id: str, user_id: str, 
                                     references: Dict[str, Any]) -> bool:
        """Update report cross-references"""
        try:
            doc_ref = self.db.collection(self.reports_collection).document(report_id)
            
            # Verify ownership first
            doc = await asyncio.to_thread(doc_ref.get)
            if not doc.exists or doc.to_dict().get("user_id") != user_id:
                return False
            
            # Update references
            await asyncio.to_thread(
                doc_ref.update,
                {
                    "references": references,
                    "updated_at": datetime.utcnow()
                }
            )
            
            logger.info("Report references updated", report_id=report_id)
            return True
            
        except Exception as e:
            logger.error("Report references update failed", error=str(e), report_id=report_id)
            return False

    async def get_reports_by_reference(self, user_id: str, reference_type: str, 
                                     reference_id: str) -> List[Dict[str, Any]]:
        """Get reports that reference a specific entity"""
        try:
            # This is a complex query - in production, consider using composite indexes
            all_reports = await self.get_user_reports(user_id, limit=1000)
            
            matching_reports = []
            for report in all_reports:
                references = report.get("references", {})
                if references.get(reference_type) == reference_id:
                    matching_reports.append(report)
            
            logger.info("Reports by reference retrieved", user_id=user_id, 
                       reference_type=reference_type, count=len(matching_reports))
            return matching_reports
            
        except Exception as e:
            logger.error("Reports by reference retrieval failed", error=str(e))
            return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_user_ai_reports_paginated(self, user_id: str, page: int = 1, limit: int = 10) -> Tuple[List[Dict[str, Any]], PaginationMeta]:
        """
        Get paginated AI reports for a user with comprehensive error handling and retry logic
        
        Args:
            user_id: User ID to filter reports
            page: Page number (starts from 1)
            limit: Number of items per page (max 100)
            
        Returns:
            Tuple containing list of AIReport dictionaries and pagination metadata
        """
        try:
            logger.info(
                "Fetching paginated AI reports",
                user_id=user_id,
                page=page,
                limit=limit
            )

            # Validate pagination parameters
            if page < 1:
                page = 1
            if limit < 1 or limit > 100:
                limit = 10

            # Calculate offset for pagination
            offset = (page - 1) * limit

            # Build base query for user's reports
            base_query = self.db.collection(self.reports_collection).where("user_id", "==", user_id)

            # Get total count for pagination metadata using count aggregation
            count_query = base_query.count()
            count_result = await asyncio.to_thread(count_query.get)
            total_reports = count_result[0][0].value

            logger.info(
                "Total reports count retrieved",
                user_id=user_id,
                total_reports=total_reports
            )

            # Build paginated query with sorting and limits
            paginated_query = (base_query
                             .order_by("generated_at", direction=firestore.Query.DESCENDING)
                             .offset(offset)
                             .limit(limit))

            # Execute paginated query
            docs = await asyncio.to_thread(paginated_query.get)

            # Convert Firestore documents to AIReport dictionaries
            reports = []
            for doc in docs:
                report_data = doc.to_dict()
                
                # Convert Firestore timestamps to Python datetime objects
                if 'generated_at' in report_data and hasattr(report_data['generated_at'], 'timestamp'):
                    report_data['generated_at'] = datetime.fromtimestamp(report_data['generated_at'].timestamp())
                
                # Ensure content structure matches AIReportContent model
                if 'content' not in report_data:
                    report_data['content'] = {
                        'score': None,
                        'strengths': [],
                        'weaknesses': [],
                        'detailed_feedback': None,
                        'transcription': None
                    }
                
                # Validate and structure the content
                content = report_data['content']
                if not isinstance(content.get('strengths'), list):
                    content['strengths'] = []
                if not isinstance(content.get('weaknesses'), list):
                    content['weaknesses'] = []
                
                reports.append(report_data)

            # Calculate pagination metadata
            total_pages = (total_reports + limit - 1) // limit
            has_next = page < total_pages
            has_prev = page > 1

            pagination_meta = PaginationMeta(
                page=page,
                limit=limit,
                total=total_reports,
                total_pages=total_pages,
                has_next=has_next,
                has_prev=has_prev
            )

            logger.info(
                "Successfully retrieved paginated AI reports",
                user_id=user_id,
                reports_count=len(reports),
                total_reports=total_reports,
                page=page,
                total_pages=total_pages
            )

            return reports, pagination_meta

        except Exception as e:
            logger.error(
                "Error retrieving paginated AI reports",
                user_id=user_id,
                page=page,
                limit=limit,
                error=str(e)
            )
            # Return empty results with basic pagination on error
            pagination_meta = PaginationMeta(
                page=page,
                limit=limit,
                total=0,
                total_pages=0,
                has_next=False,
                has_prev=False
            )
            raise Exception(f"Failed to retrieve AI reports: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def create_ai_report(self, user_id: str, report_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new AI report for a user
        
        Args:
            user_id: User ID who owns the report
            report_data: Report data including type, content, application_id, interview_id
            
        Returns:
            Created AIReport dictionary
        """
        try:
            report_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            logger.info(
                "Creating AI report",
                user_id=user_id,
                report_id=report_id,
                report_type=report_data.get("report_type")
            )

            # Prepare report document
            report_doc = {
                "report_id": report_id,
                "user_id": user_id,
                "application_id": report_data.get("application_id"),
                "interview_id": report_data.get("interview_id"),
                "report_type": report_data["report_type"],
                "generated_at": timestamp,
                "content": report_data["content"]
            }
            
            # Save to Firestore
            await asyncio.to_thread(
                self.db.collection(self.reports_collection).document(report_id).set,
                report_doc
            )
            
            logger.info(
                "AI report created successfully",
                user_id=user_id,
                report_id=report_id,
                report_type=report_data["report_type"]
            )
            
            return report_doc
            
        except Exception as e:
            logger.error(
                "Error creating AI report",
                user_id=user_id,
                report_type=report_data.get("report_type"),
                error=str(e)
            )
            raise Exception(f"Failed to create AI report: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_ai_report_by_id(self, user_id: str, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single AI report by ID with user ownership validation
        
        Args:
            user_id: User ID for ownership validation
            report_id: Report ID to retrieve
            
        Returns:
            AIReport dictionary or None if not found/unauthorized
        """
        try:
            logger.info(
                "Fetching AI report by ID",
                user_id=user_id,
                report_id=report_id
            )

            doc_ref = self.db.collection(self.reports_collection).document(report_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                logger.warning(
                    "AI report not found",
                    user_id=user_id,
                    report_id=report_id
                )
                return None
            
            report_data = doc.to_dict()
            
            # Verify user ownership
            if report_data.get("user_id") != user_id:
                logger.warning(
                    "Unauthorized AI report access attempt",
                    user_id=user_id,
                    report_id=report_id,
                    owner_id=report_data.get("user_id")
                )
                return None
            
            # Convert Firestore timestamp to Python datetime
            if 'generated_at' in report_data and hasattr(report_data['generated_at'], 'timestamp'):
                report_data['generated_at'] = datetime.fromtimestamp(report_data['generated_at'].timestamp())
            
            logger.info(
                "AI report retrieved successfully",
                user_id=user_id,
                report_id=report_id
            )
            
            return report_data
            
        except Exception as e:
            logger.error(
                "Error retrieving AI report by ID",
                user_id=user_id,
                report_id=report_id,
                error=str(e)
            )
            raise Exception(f"Failed to retrieve AI report: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def update_ai_report(self, user_id: str, report_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update an existing AI report with user ownership validation
        
        Args:
            user_id: User ID for ownership validation
            report_id: Report ID to update
            update_data: Data to update (content, report_type)
            
        Returns:
            Updated AIReport dictionary or None if not found/unauthorized
        """
        try:
            logger.info(
                "Updating AI report",
                user_id=user_id,
                report_id=report_id
            )

            doc_ref = self.db.collection(self.reports_collection).document(report_id)
            
            # First verify the report exists and user owns it
            doc = await asyncio.to_thread(doc_ref.get)
            if not doc.exists:
                logger.warning(
                    "AI report not found for update",
                    user_id=user_id,
                    report_id=report_id
                )
                return None
            
            existing_data = doc.to_dict()
            if existing_data.get("user_id") != user_id:
                logger.warning(
                    "Unauthorized AI report update attempt",
                    user_id=user_id,
                    report_id=report_id,
                    owner_id=existing_data.get("user_id")
                )
                return None
            
            # Prepare update data
            update_fields = {}
            if "content" in update_data:
                update_fields["content"] = update_data["content"]
            if "report_type" in update_data:
                update_fields["report_type"] = update_data["report_type"]
            
            # Always update the timestamp
            update_fields["updated_at"] = datetime.utcnow()
            
            # Update the document
            await asyncio.to_thread(doc_ref.update, update_fields)
            
            # Get the updated document
            updated_doc = await asyncio.to_thread(doc_ref.get)
            updated_data = updated_doc.to_dict()
            
            # Convert Firestore timestamp to Python datetime
            if 'generated_at' in updated_data and hasattr(updated_data['generated_at'], 'timestamp'):
                updated_data['generated_at'] = datetime.fromtimestamp(updated_data['generated_at'].timestamp())
            if 'updated_at' in updated_data and hasattr(updated_data['updated_at'], 'timestamp'):
                updated_data['updated_at'] = datetime.fromtimestamp(updated_data['updated_at'].timestamp())
            
            logger.info(
                "AI report updated successfully",
                user_id=user_id,
                report_id=report_id
            )
            
            return updated_data
            
        except Exception as e:
            logger.error(
                "Error updating AI report",
                user_id=user_id,
                report_id=report_id,
                error=str(e)
            )
            raise Exception(f"Failed to update AI report: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def delete_ai_report(self, user_id: str, report_id: str) -> bool:
        """
        Delete an AI report with user ownership validation
        
        Args:
            user_id: User ID for ownership validation
            report_id: Report ID to delete
            
        Returns:
            True if deleted successfully, False if not found/unauthorized
        """
        try:
            logger.info(
                "Deleting AI report",
                user_id=user_id,
                report_id=report_id
            )

            doc_ref = self.db.collection(self.reports_collection).document(report_id)
            
            # First verify the report exists and user owns it
            doc = await asyncio.to_thread(doc_ref.get)
            if not doc.exists:
                logger.warning(
                    "AI report not found for deletion",
                    user_id=user_id,
                    report_id=report_id
                )
                return False
            
            existing_data = doc.to_dict()
            if existing_data.get("user_id") != user_id:
                logger.warning(
                    "Unauthorized AI report deletion attempt",
                    user_id=user_id,
                    report_id=report_id,
                    owner_id=existing_data.get("user_id")
                )
                return False
            
            # Delete the document
            await asyncio.to_thread(doc_ref.delete)
            
            logger.info(
                "AI report deleted successfully",
                user_id=user_id,
                report_id=report_id
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "Error deleting AI report",
                user_id=user_id,
                report_id=report_id,
                error=str(e)
            )
            raise Exception(f"Failed to delete AI report: {str(e)}")