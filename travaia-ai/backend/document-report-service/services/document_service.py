"""
Document Service - Enterprise file management with Firebase Storage
Handles document uploads, storage, and metadata management
"""

import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import firestore, storage
import asyncio
import aiofiles

logger = structlog.get_logger(__name__)

class DocumentService:
    """Enterprise document management service"""
    
    def __init__(self):
        # Initialize Firestore
        try:
            self.db = firestore.Client()
            self.documents_collection = "documents"
        except Exception as e:
            logger.error("Failed to initialize Firestore", error=str(e))
            raise
        
        # Initialize Firebase Storage
        try:
            self.storage_client = storage.Client()
            self.bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "travaia-e1310.appspot.com")
            self.bucket = self.storage_client.bucket(self.bucket_name)
            self.storage_enabled = True
        except Exception as e:
            logger.error("Failed to initialize Firebase Storage", error=str(e))
            raise
        
        logger.info("Document service initialized successfully")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def upload_document(self, user_id: str, file_data: bytes, filename: str, 
                            document_type: str = "misc") -> Dict[str, Any]:
        """Upload document to Firebase Storage with metadata"""
        try:
            document_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            # Determine file path based on type
            file_path = f"users/{user_id}/{document_type}/{document_id}_{filename}"
            
            if self.storage_enabled:
                # Upload to Firebase Storage
                blob = self.bucket.blob(file_path)
                await asyncio.to_thread(blob.upload_from_string, file_data)
                
                # Get download URL
                download_url = await asyncio.to_thread(blob.generate_signed_url, 
                                                     expiration=datetime.utcnow().replace(year=2030))
            else:
                download_url = f"local://documents/{document_id}_{filename}"
            
            # Create document metadata
            doc_metadata = {
                "document_id": document_id,
                "user_id": user_id,
                "filename": filename,
                "document_type": document_type,
                "file_path": file_path,
                "download_url": download_url,
                "file_size": len(file_data),
                "upload_date": timestamp,
                "created_at": timestamp,
                "updated_at": timestamp
            }
            
            # Save metadata to Firestore
            await asyncio.to_thread(
                self.db.collection(self.documents_collection).document(document_id).set,
                doc_metadata
            )
            
            logger.info("Document uploaded", document_id=document_id, user_id=user_id, 
                       filename=filename, type=document_type)
            return doc_metadata
            
        except Exception as e:
            logger.error("Document upload failed", error=str(e))
            raise Exception(f"Failed to upload document: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_document(self, document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get document metadata by ID with user validation"""
        try:
            doc_ref = self.db.collection(self.documents_collection).document(document_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                return None
            
            doc_data = doc.to_dict()
            
            # Verify user ownership
            if doc_data.get("user_id") != user_id:
                logger.warning("Unauthorized document access", document_id=document_id, user_id=user_id)
                return None
            
            return doc_data
            
        except Exception as e:
            logger.error("Document retrieval failed", error=str(e), document_id=document_id)
            return None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_documents(self, user_id: str, document_type: Optional[str] = None, 
                               limit: int = 50) -> List[Dict[str, Any]]:
        """Get all documents for a user, optionally filtered by type"""
        try:
            query = self.db.collection(self.documents_collection).where("user_id", "==", user_id)
            
            if document_type:
                query = query.where("document_type", "==", document_type)
            
            query = query.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = await asyncio.to_thread(query.get)
            documents = [doc.to_dict() for doc in docs]
            
            logger.info("Documents retrieved", user_id=user_id, count=len(documents), 
                       type=document_type)
            return documents
            
        except Exception as e:
            logger.error("Documents retrieval failed", error=str(e), user_id=user_id)
            return []

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def delete_document(self, document_id: str, user_id: str) -> bool:
        """Delete document from storage and metadata"""
        try:
            # Get document metadata first
            doc_data = await self.get_document(document_id, user_id)
            if not doc_data:
                return False
            
            # Delete from Firebase Storage
            if self.storage_enabled and doc_data.get("file_path"):
                blob = self.bucket.blob(doc_data["file_path"])
                await asyncio.to_thread(blob.delete)
            
            # Delete metadata from Firestore
            await asyncio.to_thread(
                self.db.collection(self.documents_collection).document(document_id).delete
            )
            
            logger.info("Document deleted", document_id=document_id, user_id=user_id)
            return True
            
        except Exception as e:
            logger.error("Document deletion failed", error=str(e), document_id=document_id)
            return False

    async def get_storage_usage(self, user_id: str) -> Dict[str, Any]:
        """Get user's storage usage statistics"""
        try:
            documents = await self.get_user_documents(user_id, limit=1000)
            
            total_size = sum(doc.get("file_size", 0) for doc in documents)
            type_breakdown = {}
            
            for doc in documents:
                doc_type = doc.get("document_type", "misc")
                if doc_type not in type_breakdown:
                    type_breakdown[doc_type] = {"count": 0, "size": 0}
                type_breakdown[doc_type]["count"] += 1
                type_breakdown[doc_type]["size"] += doc.get("file_size", 0)
            
            return {
                "user_id": user_id,
                "total_documents": len(documents),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "type_breakdown": type_breakdown
            }
            
        except Exception as e:
            logger.error("Storage usage calculation failed", error=str(e))
            return {"error": str(e)}