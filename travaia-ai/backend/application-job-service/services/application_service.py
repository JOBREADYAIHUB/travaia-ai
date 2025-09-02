"""
Application Service - Enterprise job application management
Handles applications, contacts, notes with Firestore and Pub/Sub integration
"""

import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud.firestore_v1.async_client import AsyncClient as AsyncFirestoreClient
from google.cloud import firestore, pubsub_v1
import asyncio

from models.dto import ApplicationCreateRequest, ApplicationUpdateRequest, ContactAddRequest, NoteAddRequest

logger = structlog.get_logger(__name__)

class ApplicationService:
    """Enterprise application management service"""
    
    def __init__(self):
        # Initialize basic configuration
        self.applications_collection = "jobApplications"
        self.favorites_collection = "favorite_jobs"
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        self.db: AsyncFirestoreClient = None
        self.pubsub_enabled = False
        
        # Initialize Firestore and raise error on failure
        try:
            # Use default credentials (Cloud Run service account)
            from google.auth import default
            credentials, _ = default()
            self.db = AsyncFirestoreClient(project=self.project_id, credentials=credentials)
            logger.info(f"Firestore async client created for project: {self.project_id}")
            
        except Exception as e:
            logger.error(f"CRITICAL: Firestore async client creation failed: {type(e).__name__}: {e}")
            # Re-raise as a more specific error to halt startup
            raise ConnectionError(f"Failed to connect to Firestore: {e}")
        
        # Initialize Pub/Sub for event-driven architecture
        try:
            self.publisher = pubsub_v1.PublisherClient()
            self.topic_path = self.publisher.topic_path(self.project_id, "application-events")
            self.pubsub_enabled = True
            logger.info("Pub/Sub initialized successfully")
        except Exception as e:
            logger.warning("Pub/Sub not available", error=str(e))
            self.pubsub_enabled = False
        
        logger.info("Application service initialized", 
                   firestore_available=self.db is not None,
                   pubsub_enabled=self.pubsub_enabled)

    def _convert_firestore_timestamps(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recursively and safely convert Firestore timestamps and nested structures.
        Handles potential TypeError from malformed list or dict fields.
        """
        try:
            if not isinstance(data, dict):
                return data  # Return non-dict data as-is (base case for recursion)

            processed_data = {}
            for key, value in data.items():
                if isinstance(value, datetime):
                    processed_data[key] = value
                    continue
                
                if hasattr(value, 'to_pydatetime'):
                    processed_data[key] = value.to_pydatetime()
                elif isinstance(value, list):
                    # Safely process each item in the list
                    processed_data[key] = [self._convert_firestore_timestamps(item) for item in value]
                elif isinstance(value, dict):
                    processed_data[key] = self._convert_firestore_timestamps(value)
                else:
                    processed_data[key] = value # Keep other types as they are
            return processed_data
        except TypeError as te:
            logger.error(
                "Critical TypeError during data conversion, likely from malformed document field.",
                data_type=type(data),
                error=str(te),
                exc_info=True
            )
            # Return the original data or None to prevent a crash
            return data

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def create_application(self, user_id: str, application_data: ApplicationCreateRequest) -> Dict[str, Any]:
        """Create new job application with AI analysis trigger"""
        try:
            application_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            # Process contacts and notes with IDs
            processed_contacts = []
            if application_data.contacts:
                for contact in application_data.contacts:
                    contact_dict = contact.model_dump()
                    contact_dict["contact_id"] = str(uuid.uuid4())
                    contact_dict["createdAt"] = timestamp
                    processed_contacts.append(contact_dict)
            
            processed_notes = []
            if application_data.notes:
                for note in application_data.notes:
                    note_dict = note.model_dump()
                    note_dict["note_id"] = str(uuid.uuid4())
                    note_dict["createdAt"] = timestamp
                    processed_notes.append(note_dict)
            
            # Prepare application document
            app_doc = {
                "application_id": application_id,
                "user_id": user_id,
                "job_title": application_data.job_title,
                "company_name": application_data.company_name,
                "link_to_job_post": application_data.link_to_job_post or "",
                "job_description": application_data.job_description or "",
                "status": application_data.status or "draft",
                "application_date": application_data.application_date or timestamp,
                "contacts": processed_contacts,
                "notes": processed_notes,
                "ai_job_fit_report_id": None,  # Will be populated by AI service
                "createdAt": timestamp,
                "updatedAt": timestamp
            }
            
            # Save to nested collection under user document
            await self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id).set(app_doc)
            
            # Trigger AI analysis via Pub/Sub
            if self.pubsub_enabled and application_data.job_description:
                await self._publish_ai_analysis_event(application_id, app_doc)
            
            logger.info("Application created", application_id=application_id, user_id=user_id)
            return app_doc
            
        except Exception as e:
            logger.error("Application creation failed", error=str(e))
            raise Exception(f"Failed to create application: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_application_by_id(self, user_id: str, application_id: str) -> Optional[Dict[str, Any]]:
        """Get application by ID with user validation and proper timestamp conversion"""
        try:
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            doc = await doc_ref.get()
            
            if not doc.exists:
                logger.info("Application not found", application_id=application_id, user_id=user_id)
                return None
            
            app_data = doc.to_dict()
            
            # Verify user ownership
            if app_data.get("user_id") != user_id:
                logger.warning("Unauthorized application access", application_id=application_id, user_id=user_id)
                return None
            
            # Convert Firestore timestamps to datetime objects for proper serialization
            timestamp_fields = ['createdAt', 'updatedAt', 'application_date']
            for field in timestamp_fields:
                if field in app_data and app_data[field]:
                    # Convert Firestore timestamp to datetime
                    if hasattr(app_data[field], 'to_pydatetime'):
                        app_data[field] = app_data[field].to_pydatetime()
                    elif hasattr(app_data[field], 'timestamp'):
                        app_data[field] = datetime.fromtimestamp(app_data[field].timestamp())
            
            # Process contacts and notes timestamps
            if 'contacts' in app_data and app_data['contacts']:
                for contact in app_data['contacts']:
                    if 'createdAt' in contact and contact['createdAt']:
                        if hasattr(contact['createdAt'], 'to_pydatetime'):
                            contact['createdAt'] = contact['createdAt'].to_pydatetime()
            
            if 'notes' in app_data and app_data['notes']:
                for note in app_data['notes']:
                    if 'createdAt' in note and note['createdAt']:
                        if hasattr(note['createdAt'], 'to_pydatetime'):
                            note['createdAt'] = note['createdAt'].to_pydatetime()
            
            logger.info("Application retrieved successfully", application_id=application_id, user_id=user_id)
            return app_data
            
        except Exception as e:
            logger.error("Application retrieval failed", error=str(e), application_id=application_id, user_id=user_id)
            raise Exception(f"Failed to retrieve application: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def update_application(self, user_id: str, application_id: str, update_data: ApplicationUpdateRequest) -> Optional[Dict[str, Any]]:
        """Update application with user validation and proper timestamp handling"""
        try:
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            doc = await doc_ref.get()
            
            # Check if application exists
            if not doc.exists:
                logger.info("Application not found for update", application_id=application_id, user_id=user_id)
                return None
            
            existing_data = doc.to_dict()
            
            # Verify user ownership
            if existing_data.get("user_id") != user_id:
                logger.warning("Unauthorized application update attempt", application_id=application_id, user_id=user_id)
                return None
            
            update_fields = update_data.model_dump(exclude_unset=True)
            timestamp = datetime.utcnow()
            
            # Always update the updated_at timestamp
            update_fields['updatedAt'] = timestamp
            
            # Perform the update
            await doc_ref.update(update_fields)
            
            # Retrieve and return the updated document
            updated_doc = await doc_ref.get()
            updated_data = updated_doc.to_dict()
            
            # Convert Firestore timestamps for response
            timestamp_fields = ['createdAt', 'updatedAt', 'application_date']
            for field in timestamp_fields:
                if field in updated_data and updated_data[field]:
                    if hasattr(updated_data[field], 'to_pydatetime'):
                        updated_data[field] = updated_data[field].to_pydatetime()
                    elif hasattr(updated_data[field], 'timestamp'):
                        updated_data[field] = datetime.fromtimestamp(updated_data[field].timestamp())
            
            # Process contacts and notes timestamps
            if 'contacts' in updated_data and updated_data['contacts']:
                for contact in updated_data['contacts']:
                    if 'createdAt' in contact and contact['createdAt']:
                        if hasattr(contact['createdAt'], 'to_pydatetime'):
                            contact['createdAt'] = contact['createdAt'].to_pydatetime()
            
            if 'notes' in updated_data and updated_data['notes']:
                for note in updated_data['notes']:
                    if 'createdAt' in note and note['createdAt']:
                        if hasattr(note['createdAt'], 'to_pydatetime'):
                            note['createdAt'] = note['createdAt'].to_pydatetime()
            
            logger.info("Application updated successfully", application_id=application_id, user_id=user_id, updated_fields=list(update_fields.keys()))
            return updated_data
            
        except Exception as e:
            logger.error("Application update failed", error=str(e), application_id=application_id, user_id=user_id)
            raise Exception(f"Failed to update application: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def delete_application(self, user_id: str, application_id: str) -> bool:
        """Delete application with user validation and cascade delete of related data"""
        try:
            # First, fetch and validate the application exists and belongs to user
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            doc = await doc_ref.get()
            
            if not doc.exists:
                logger.info("Application not found for deletion", application_id=application_id, user_id=user_id)
                return False
            
            app_data = doc.to_dict()
            
            # Verify user ownership
            if app_data.get("user_id") != user_id:
                logger.warning("Unauthorized application deletion attempt", application_id=application_id, user_id=user_id)
                return False
            
            # Start cascade delete process
            logger.info("Starting cascade delete for application", application_id=application_id, user_id=user_id)
            
            # 1. Delete related AI reports from the user's nested collection
            ai_report_id = app_data.get("ai_job_fit_report_id")
            if ai_report_id:
                try:
                    # Assuming ai_reports are stored under a user's subcollection
                    ai_report_ref = self.db.collection("users").document(user_id).collection("ai_reports").document(ai_report_id)
                    await ai_report_ref.delete()
                    logger.info("Deleted AI job fit report", report_id=ai_report_id, application_id=application_id)
                except Exception as e:
                    logger.warning("Failed to delete AI report", error=str(e), report_id=ai_report_id)

            # 2. Delete related interviews and their attempts from the user's nested collection
            interviews_query = self.db.collection("users").document(user_id).collection("interviews").where("application_id", "==", application_id)
            interviews_docs = interviews_query.stream()
            
            async for interview_doc in interviews_docs:
                interview_id = interview_doc.id
                interview_data = interview_doc.to_dict()
                
                try:
                    # Delete interview attempts and their AI reports
                    attempts = interview_data.get("attempts", [])
                    for attempt in attempts:
                        feedback_report_id = attempt.get("feedback_report_id")
                        if feedback_report_id:
                            try:
                                feedback_report_ref = self.db.collection("ai_reports").document(feedback_report_id)
                                await feedback_report_ref.delete()
                                logger.info("Deleted interview feedback report", report_id=feedback_report_id, interview_id=interview_id)
                            except Exception as e:
                                logger.warning("Failed to delete feedback report", error=str(e), report_id=feedback_report_id)
                    
                    # Delete the interview document
                    await interview_doc.reference.delete()
                    logger.info("Deleted interview", interview_id=interview_id, application_id=application_id)
                    
                except Exception as e:
                    logger.error("Failed to delete interview", error=str(e), interview_id=interview_id)
            
            # 3. Finally, delete the application document
            await doc_ref.delete()
            
            logger.info("Application and related data deleted successfully", 
                       application_id=application_id, 
                       user_id=user_id,
                       job_title=app_data.get("job_title"),
                       interviews_deleted=len(interviews_docs))
            
            return True
            
        except Exception as e:
            logger.error("Application deletion failed", error=str(e), application_id=application_id, user_id=user_id)
            raise Exception(f"Failed to delete application: {str(e)}")



    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def add_contact_to_application(self, user_id: str, application_id: str, contact_data: ContactAddRequest) -> Dict[str, Any]:
        """
        Add a new contact to an existing job application
        
        Args:
            user_id: ID of the authenticated user
            application_id: ID of the application to add contact to
            contact_data: Contact information to add
            
        Returns:
            Updated application data
            
        Raises:
            HTTPException: If application not found or user not authorized
        """
        try:
            logger.info("Adding contact to application", 
                       application_id=application_id, 
                       user_id=user_id,
                       contact_name=contact_data.name)
            
            # Get application document reference
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            
            # Retrieve the application document
            doc = await doc_ref.get()
            
            if not doc.exists:
                logger.warning("Application not found", application_id=application_id, user_id=user_id)
                raise HTTPException(
                    status_code=404,
                    detail=f"Application with ID {application_id} not found"
                )
            
            app_data = doc.to_dict()
            
            # Verify user ownership
            if app_data.get("user_id") != user_id:
                logger.warning("Unauthorized access attempt", 
                             application_id=application_id, 
                             user_id=user_id,
                             owner_id=app_data.get("user_id"))
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to modify this application"
                )
            
            # Generate unique contact ID
            contact_id = str(uuid.uuid4())
            
            # Prepare contact data with ID and timestamp
            new_contact = contact_data.model_dump()
            new_contact["contact_id"] = contact_id
            new_contact["createdAt"] = datetime.utcnow()
            
            # Get existing contacts or initialize empty list
            existing_contacts = app_data.get("contacts", [])
            existing_contacts.append(new_contact)
            
            # Update application with new contact and timestamp
            update_data = {
                "contacts": existing_contacts,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            
            await doc_ref.update(update_data)
            
            # Retrieve updated document for response
            updated_doc = await doc_ref.get()
            updated_data = updated_doc.to_dict()
            
            # Convert Firestore timestamps
            updated_data = self._convert_firestore_timestamps(updated_data)
            
            logger.info("Contact added successfully", 
                       application_id=application_id,
                       user_id=user_id,
                       contact_id=contact_id,
                       contact_name=new_contact["name"])
            
            return updated_data
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error("Failed to add contact to application", 
                        error=str(e), 
                        application_id=application_id, 
                        user_id=user_id)
            raise Exception(f"Failed to add contact: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def add_note_to_application(self, user_id: str, application_id: str, note_data: NoteAddRequest) -> Dict[str, Any]:
        """
        Add a new note to an existing job application
        
        Args:
            user_id: ID of the authenticated user
            application_id: ID of the application to add note to
            note_data: Note information to add
            
        Returns:
            Updated application data
            
        Raises:
            HTTPException: If application not found or user not authorized
        """
        try:
            logger.info("Adding note to application", 
                       application_id=application_id, 
                       user_id=user_id,
                       note_content_length=len(note_data.content))
            
            # Get application document reference
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            
            # Retrieve the application document
            doc = await doc_ref.get()
            
            if not doc.exists:
                logger.warning("Application not found", application_id=application_id, user_id=user_id)
                raise HTTPException(
                    status_code=404,
                    detail=f"Application with ID {application_id} not found"
                )
            
            app_data = doc.to_dict()
            
            # Verify user ownership
            if app_data.get("user_id") != user_id:
                logger.warning("Unauthorized access attempt", 
                             application_id=application_id, 
                             user_id=user_id,
                             owner_id=app_data.get("user_id"))
                raise HTTPException(
                    status_code=403,
                    detail="You are not authorized to modify this application"
                )
            
            # Generate unique note ID
            note_id = str(uuid.uuid4())
            
            # Prepare note data with ID and timestamp
            new_note = note_data.model_dump()
            new_note["note_id"] = note_id
            new_note["createdAt"] = datetime.utcnow()
            
            # Get existing notes or initialize empty list
            existing_notes = app_data.get("notes", [])
            existing_notes.append(new_note)
            
            # Update application with new note and timestamp
            update_data = {
                "notes": existing_notes,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            
            await doc_ref.update(update_data)
            
            # Retrieve updated document for response
            updated_doc = await doc_ref.get()
            updated_data = updated_doc.to_dict()
            
            # Convert Firestore timestamps
            updated_data = self._convert_firestore_timestamps(updated_data)
            
            logger.info("Note added successfully", 
                       application_id=application_id,
                       user_id=user_id,
                       note_id=note_id,
                       note_content_length=len(new_note["content"]))
            
            return updated_data
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error("Failed to add note to application", 
                        error=str(e), 
                        application_id=application_id, 
                        user_id=user_id)
            raise Exception(f"Failed to add note: {str(e)}")

    # Keep the old method for backward compatibility
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_application(self, application_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get application by ID with user validation (legacy method)"""
        return await self.get_application_by_id(user_id, application_id)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def update_application_status(self, application_id: str, user_id: str, status: str) -> bool:
        """Update application status with event publishing"""
        try:
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            
            # Verify ownership first
            doc = await doc_ref.get()
            if not doc.exists or doc.to_dict().get("user_id") != user_id:
                return False
            
            # Update status
            await doc_ref.update(
                {
                    "status": status,
                    "updatedAt": datetime.utcnow()
                }
            )
            
            # Publish status change event
            if self.pubsub_enabled:
                await self._publish_status_change_event(application_id, user_id, status)
            
            logger.info("Application status updated", application_id=application_id, status=status)
            return True
            
        except Exception as e:
            logger.error("Status update failed", error=str(e), application_id=application_id)
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def add_contact(self, application_id: str, user_id: str, contact_data: Dict[str, Any]) -> bool:
        """Add contact to application"""
        try:
            contact_id = str(uuid.uuid4())
            contact = {
                "contact_id": contact_id,
                "name": contact_data["name"],
                "role": contact_data.get("role", ""),
                "email": contact_data.get("email", ""),
                "phone": contact_data.get("phone", ""),
                "addedAt": datetime.utcnow()
            }
            
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            
            # Verify ownership and add contact
            doc = await doc_ref.get()
            if not doc.exists or doc.to_dict().get("user_id") != user_id:
                return False
            
            await doc_ref.update(
                {
                    "contacts": firestore.ArrayUnion([contact]),
                    "updatedAt": datetime.utcnow()
                }
            )
            
            logger.info("Contact added", application_id=application_id, contact_id=contact_id)
            return True
            
        except Exception as e:
            logger.error("Contact addition failed", error=str(e))
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def add_note(self, application_id: str, user_id: str, note_content: str) -> bool:
        """Add note to application"""
        try:
            note_id = str(uuid.uuid4())
            note = {
                "note_id": note_id,
                "content": note_content,
                "createdAt": datetime.utcnow()
            }
            
            doc_ref = self.db.collection("users").document(user_id).collection(self.applications_collection).document(application_id)
            
            # Verify ownership and add note
            doc = await doc_ref.get()
            if not doc.exists or doc.to_dict().get("user_id") != user_id:
                return False
            
            await doc_ref.update(
                {
                    "notes": firestore.ArrayUnion([note]),
                    "updatedAt": datetime.utcnow()
                }
            )
            
            logger.info("Note added", application_id=application_id, note_id=note_id)
            return True
            
        except Exception as e:
            logger.error("Note addition failed", error=str(e))
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_all_user_applications(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all applications for a specific user, without pagination.
        This is intended for analytics purposes where the full dataset is required.

        Args:
            user_id: User ID to get all applications for.

        Returns:
            A list of all application dictionaries for the user.
        """
        try:
            logger.info("Starting full applications retrieval for analytics", user_id=user_id)
            
            if not self.db:
                logger.warning("Firestore not available, returning empty list for analytics")
                return []

            user_doc_ref = self.db.collection("users").document(user_id)
            user_doc = await user_doc_ref.get()
            if not user_doc.exists:
                logger.warning("User document does not exist for analytics query", user_id=user_id)
                return []

            applications_ref = user_doc_ref.collection(self.applications_collection)
            query = applications_ref.order_by("createdAt", direction=firestore.Query.DESCENDING)
            
            docs_stream = query.stream()
            
            applications = []
            async for doc in docs_stream:
                app_data = doc.to_dict()
                app_data['application_id'] = doc.id
                if 'status' in app_data and isinstance(app_data['status'], str):
                    app_data['status'] = app_data['status'].lower().replace(' ', '')
                    if app_data['status'] == 'offerreceived':
                        app_data['status'] = 'offer'
                app_data['user_id'] = user_id
                # Convert any Firestore timestamps to timezone-aware datetimes
                converted_data = self._convert_firestore_timestamps(app_data)
                applications.append(converted_data)

            logger.info("Full applications retrieval successful", user_id=user_id, count=len(applications))
            return applications

        except Exception as e:
            logger.error("Full applications retrieval for analytics failed", 
                         error=str(e), 
                         user_id=user_id, 
                         exc_info=True)
            # In case of error, return an empty list to avoid breaking the analytics view
            return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_applications_paginated(self, user_id: str, limit: int = 10, cursor: Optional[str] = None) -> Dict[str, Any]:
        """
        Get paginated applications for a user with cursor-based pagination.

        Args:
            user_id: The user's ID.
            limit: The number of items per page.
            cursor: The cursor for the next page.

        Returns:
            A dictionary containing the list of applications and the next cursor.
        """
        try:
            logger.info(
                "Fetching paginated applications",
                user_id=user_id,
                limit=limit,
                cursor=cursor
            )

            collection_ref = self.db.collection("users").document(user_id).collection(self.applications_collection)
            query = collection_ref.order_by("createdAt", direction=firestore.Query.DESCENDING)

            if cursor:
                cursor_doc = await self.db.collection("users").document(user_id).collection(self.applications_collection).document(cursor).get()
                if not cursor_doc.exists:
                    raise ValueError("Invalid cursor")
                query = query.start_after(cursor_doc)

            paginated_query = query.limit(limit)
            docs = paginated_query.stream()

            applications = []
            last_doc = None
            async for doc in docs:
                try:
                    app_data = doc.to_dict()
                    app_data['application_id'] = doc.id

                    # Safely get job_title and company_name
                    job_title = app_data.get('job_title')
                    if not job_title and isinstance(app_data.get('role'), dict):
                        job_title = app_data['role'].get('title')
                    app_data['job_title'] = job_title or ""

                    company_name = app_data.get('company_name')
                    if not company_name and isinstance(app_data.get('company'), dict):
                        company_name = app_data['company'].get('name')
                    app_data['company_name'] = company_name or ""

                    if 'status' in app_data and isinstance(app_data['status'], str):
                        app_data['status'] = app_data['status'].lower().replace(' ', '')
                        if app_data['status'] == 'offerreceived':
                            app_data['status'] = 'offer'
                    
                    converted_data = self._convert_firestore_timestamps(app_data)
                    applications.append(converted_data)
                    last_doc = doc
                except Exception as doc_e:
                    logger.error(
                        "Error processing application document",
                        error=str(doc_e),
                        document_id=doc.id if doc else "N/A",
                        user_id=user_id,
                        exc_info=True
                    )
                    # Optionally, you can choose to skip this problematic document
                    # and continue processing others, or re-raise if it's critical.
                    # For now, we'll just log and skip.
                    continue

            next_cursor = last_doc.id if last_doc and len(applications) == limit else None

            logger.info(
                "Successfully retrieved applications",
                user_id=user_id,
                retrieved_count=len(applications)
            )

            return {"applications": applications, "next_cursor": next_cursor}

        except Exception as e:
            logger.error(
                "Paginated applications retrieval failed",
                error=str(e),
                user_id=user_id,
                limit=limit,
                exc_info=True
            )
            return {"applications": [], "next_cursor": None}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def save_favorite_job(self, user_id: str, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save job as favorite"""
        try:
            favorite_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            favorite_doc = {
                "favorite_job_id": favorite_id,
                "user_id": user_id,
                "job_title": job_data["job_title"],
                "company_name": job_data["company_name"],
                "link": job_data.get("link", ""),
                "saved_date": timestamp
            }
            
            # Use proper nested collection path
            doc_ref = self.db.collection("users").document(user_id).collection(self.favorites_collection).document(favorite_id)
            await doc_ref.set(favorite_doc)
            
            logger.info("Job saved as favorite", favorite_id=favorite_id, user_id=user_id)
            return favorite_doc
            
        except Exception as e:
            logger.error("Favorite save failed", error=str(e))
            raise Exception(f"Failed to save favorite: {str(e)}")

    async def _publish_ai_analysis_event(self, application_id: str, application_data: Dict[str, Any]):
        """Publish AI analysis request event"""
        try:
            event_data = {
                "event_type": "ai_analysis_requested",
                "application_id": application_id,
                "user_id": application_data["user_id"],
                "job_description": application_data.get("job_description", ""),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            message = str(event_data).encode("utf-8")
            future = self.publisher.publish(self.topic_path, message)
            await future
            
            logger.info("AI analysis event published", application_id=application_id)
            
        except Exception as e:
            logger.error("Event publishing failed", error=str(e))

    async def _publish_status_change_event(self, application_id: str, user_id: str, status: str):
        """Publish application status change event"""
        try:
            event_data = {
                "event_type": "application_status_changed",
                "application_id": application_id,
                "user_id": user_id,
                "new_status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            message = str(event_data).encode("utf-8")
            future = self.publisher.publish(self.topic_path, message)
            await future
            
            logger.info("Status change event published", application_id=application_id, status=status)
            
        except Exception as e:
            logger.error("Event publishing failed", error=str(e))