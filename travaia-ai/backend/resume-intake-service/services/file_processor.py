"""
File Processing Service
Handles file storage, retrieval, and management for resume files
"""

import os
import uuid
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime
import asyncio
from firebase_admin import storage
from google.cloud import pubsub_v1
import logging

logger = logging.getLogger(__name__)

class FileProcessor:
    """Service for processing and managing resume files"""
    
    def __init__(self):
        self.bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET", "travaia-e1310.appspot.com")
        self.pubsub_client = pubsub_v1.PublisherClient()
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "travaia-e1310")
        
    async def generate_resume_id(self, user_id: str) -> str:
        """Generate unique resume ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"resume_{user_id}_{timestamp}_{unique_id}"
    
    async def store_file(
        self, 
        file_content: bytes, 
        filename: str, 
        resume_id: str, 
        user_id: str
    ) -> str:
        """Store file in Firebase Storage"""
        try:
            # Create storage path
            file_extension = filename.split('.')[-1].lower()
            storage_path = f"users/{user_id}/resumes/{resume_id}/original.{file_extension}"
            
            # Get Firebase Storage bucket
            bucket = storage.bucket(self.bucket_name)
            blob = bucket.blob(storage_path)
            
            # Set metadata
            blob.metadata = {
                "resumeId": resume_id,
                "userId": user_id,
                "originalFilename": filename,
                "uploadedAt": datetime.now().isoformat(),
                "fileSize": str(len(file_content))
            }
            
            # Upload file
            blob.upload_from_string(
                file_content,
                content_type=self._get_content_type(file_extension)
            )
            
            # Make file accessible (with signed URL)
            blob.make_public()
            
            logger.info(f"File stored successfully: {storage_path}")
            return blob.public_url
            
        except Exception as e:
            logger.error(f"Error storing file: {str(e)}")
            raise Exception(f"Failed to store file: {str(e)}")
    
    async def download_file(self, file_url: str) -> bytes:
        """Download file from Firebase Storage"""
        try:
            # Extract storage path from URL
            bucket = storage.bucket(self.bucket_name)
            
            # Parse the URL to get the blob path
            if "googleapis.com" in file_url:
                # Extract path from public URL
                path_start = file_url.find("/o/") + 3
                path_end = file_url.find("?") if "?" in file_url else len(file_url)
                blob_path = file_url[path_start:path_end].replace("%2F", "/")
            else:
                raise ValueError("Invalid file URL format")
            
            blob = bucket.blob(blob_path)
            
            if not blob.exists():
                raise FileNotFoundError("File not found in storage")
            
            # Download file content
            file_content = blob.download_as_bytes()
            
            logger.info(f"File downloaded successfully: {blob_path}")
            return file_content
            
        except Exception as e:
            logger.error(f"Error downloading file: {str(e)}")
            raise Exception(f"Failed to download file: {str(e)}")
    
    async def delete_file(self, file_url: str) -> bool:
        """Delete file from Firebase Storage"""
        try:
            # Extract storage path from URL
            bucket = storage.bucket(self.bucket_name)
            
            # Parse the URL to get the blob path
            if "googleapis.com" in file_url:
                path_start = file_url.find("/o/") + 3
                path_end = file_url.find("?") if "?" in file_url else len(file_url)
                blob_path = file_url[path_start:path_end].replace("%2F", "/")
            else:
                raise ValueError("Invalid file URL format")
            
            blob = bucket.blob(blob_path)
            
            if blob.exists():
                blob.delete()
                logger.info(f"File deleted successfully: {blob_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {blob_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting file: {str(e)}")
            raise Exception(f"Failed to delete file: {str(e)}")
    
    async def get_file_metadata(self, file_url: str) -> Dict[str, Any]:
        """Get file metadata from Firebase Storage"""
        try:
            bucket = storage.bucket(self.bucket_name)
            
            # Parse the URL to get the blob path
            if "googleapis.com" in file_url:
                path_start = file_url.find("/o/") + 3
                path_end = file_url.find("?") if "?" in file_url else len(file_url)
                blob_path = file_url[path_start:path_end].replace("%2F", "/")
            else:
                raise ValueError("Invalid file URL format")
            
            blob = bucket.blob(blob_path)
            
            if not blob.exists():
                raise FileNotFoundError("File not found in storage")
            
            # Reload to get latest metadata
            blob.reload()
            
            return {
                "name": blob.name,
                "size": blob.size,
                "contentType": blob.content_type,
                "created": blob.time_created.isoformat() if blob.time_created else None,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "metadata": blob.metadata or {},
                "md5Hash": blob.md5_hash,
                "etag": blob.etag
            }
            
        except Exception as e:
            logger.error(f"Error getting file metadata: {str(e)}")
            raise Exception(f"Failed to get file metadata: {str(e)}")
    
    async def generate_signed_url(self, file_url: str, expiration_hours: int = 1) -> str:
        """Generate signed URL for secure file access"""
        try:
            from datetime import timedelta
            
            bucket = storage.bucket(self.bucket_name)
            
            # Parse the URL to get the blob path
            if "googleapis.com" in file_url:
                path_start = file_url.find("/o/") + 3
                path_end = file_url.find("?") if "?" in file_url else len(file_url)
                blob_path = file_url[path_start:path_end].replace("%2F", "/")
            else:
                raise ValueError("Invalid file URL format")
            
            blob = bucket.blob(blob_path)
            
            # Generate signed URL
            signed_url = blob.generate_signed_url(
                expiration=datetime.now() + timedelta(hours=expiration_hours),
                method="GET"
            )
            
            return signed_url
            
        except Exception as e:
            logger.error(f"Error generating signed URL: {str(e)}")
            raise Exception(f"Failed to generate signed URL: {str(e)}")
    
    async def trigger_deconstruction(self, resume_id: str, user_id: str) -> bool:
        """Trigger resume deconstruction service via Pub/Sub"""
        try:
            topic_name = f"projects/{self.project_id}/topics/resume-deconstruction"
            
            message_data = {
                "resumeId": resume_id,
                "userId": user_id,
                "timestamp": datetime.now().isoformat(),
                "source": "resume-intake-service"
            }
            
            # Convert to bytes
            data = str(message_data).encode("utf-8")
            
            # Publish message
            future = self.pubsub_client.publish(topic_name, data)
            message_id = future.result()
            
            logger.info(f"Deconstruction triggered for resume {resume_id}, message ID: {message_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error triggering deconstruction: {str(e)}")
            return False
    
    def _get_content_type(self, file_extension: str) -> str:
        """Get content type based on file extension"""
        content_types = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword"
        }
        return content_types.get(file_extension.lower(), "application/octet-stream")
    
    def _calculate_file_hash(self, file_content: bytes) -> str:
        """Calculate MD5 hash of file content"""
        return hashlib.md5(file_content).hexdigest()
