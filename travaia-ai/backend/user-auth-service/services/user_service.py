"""
User Service for TRAVAIA User & Authentication Service
Handles user profile management, settings, and data operations
"""

import firebase_admin
from firebase_admin import firestore
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from models.dto import UserProfileUpdate, UserProgressUpdate, UserSettingsUpdate
import logging
import os
import sys

# Add shared directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from firebase_config import cloud_config

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self):
        """Initialize UserService using centralized cloud config"""
        self.cloud_config = cloud_config
        self._firestore_available = self.cloud_config.firestore_available
        self.users_collection = "users"
        
        if self._firestore_available:
            try:
                self.db = self.cloud_config.get_firestore_client()
                logger.info("UserService initialized with Firestore")
            except Exception as e:
                logger.error(f"Failed to get Firestore client: {e}")
                self.db = None
                self._firestore_available = False
        else:
            self.db = None
            logger.warning("UserService initialized without Firestore")
    
    async def create_user_profile(
        self, 
        user_id: str, 
        email: str, 
        display_name: str, 
        preferred_language: str = "en"
    ) -> Dict[str, Any]:
        """Create a new user profile in Firestore"""
        try:
            if not self._firestore_available:
                return {
                    "user_id": user_id,
                    "email": email,
                    "display_name": display_name,
                    "status": "service_unavailable"
                }
            
            now = datetime.now(timezone.utc)
            
            user_data = {
                "user_id": user_id,
                "email": email,
                "display_name": display_name,
                "preferred_language": preferred_language,
                "created_at": now,
                "updated_at": now,
                "last_login": None,
                "email_verified": False,
                "profile_completion": 0.3,  # Basic info completed
                
                # Profile fields
                "bio": None,
                "location": None,
                "phone": None,
                "linkedin_url": None,
                "github_url": None,
                "portfolio_url": None,
                
                # Gamification fields
                "total_xp": 0,
                "current_level": 1,
                "achievements": [],
                "streaks": {
                    "login": {"current": 0, "longest": 0, "last_date": None},
                    "interview": {"current": 0, "longest": 0, "last_date": None},
                    "application": {"current": 0, "longest": 0, "last_date": None}
                },
                
                # Settings
                "settings": {
                    "email_notifications": True,
                    "push_notifications": True,
                    "interview_reminders": True,
                    "job_alerts": True,
                    "weekly_reports": True,
                    "privacy_level": "private",
                    "theme_preference": "auto"
                }
            }
            
            # Create user document
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.set(user_data)
            
            logger.info(f"Created user profile for user_id: {user_id}")
            return user_data
            
        except Exception as e:
            logger.error(f"Failed to create user profile: {str(e)}")
            raise
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get basic user profile"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                return user_doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user profile: {str(e)}")
            raise
    
    async def get_detailed_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user profile with all fields"""
        return await self.get_user_profile(user_id)
    
    async def update_user_profile(
        self, 
        user_id: str, 
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update user profile with provided data"""
        try:
            # Add updated timestamp
            update_data["updated_at"] = datetime.now(timezone.utc)
            
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update(update_data)
            
            # Return updated profile
            updated_profile = await self.get_user_profile(user_id)
            
            logger.info(f"Updated user profile for user_id: {user_id}")
            return updated_profile
            
        except Exception as e:
            logger.error(f"Failed to update user profile: {str(e)}")
            raise
    
    async def update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        try:
            now = datetime.now(timezone.utc)
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                "last_login": now,
                "updated_at": now
            })
            
            # Update login streak
            await self._update_login_streak(user_id)
            
        except Exception as e:
            logger.error(f"Failed to update last login: {str(e)}")
            raise
    
    async def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user settings"""
        try:
            profile = await self.get_user_profile(user_id)
            return profile.get("settings") if profile else None
            
        except Exception as e:
            logger.error(f"Failed to get user settings: {str(e)}")
            raise
    
    async def update_user_settings(
        self, 
        user_id: str, 
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update user settings"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                "settings": settings,
                "updated_at": datetime.now(timezone.utc)
            })
            
            return settings
            
        except Exception as e:
            logger.error(f"Failed to update user settings: {str(e)}")
            raise
    
    def calculate_profile_completion(self, profile: Dict[str, Any]) -> float:
        """Calculate profile completion percentage"""
        try:
            required_fields = [
                "display_name", "email", "preferred_language"
            ]
            optional_fields = [
                "bio", "location", "phone", "linkedin_url", 
                "github_url", "portfolio_url"
            ]
            
            completed_required = sum(1 for field in required_fields if profile.get(field))
            completed_optional = sum(1 for field in optional_fields if profile.get(field))
            
            # Required fields are worth 70%, optional fields 30%
            required_score = (completed_required / len(required_fields)) * 0.7
            optional_score = (completed_optional / len(optional_fields)) * 0.3
            
            return round(required_score + optional_score, 2)
            
        except Exception as e:
            logger.error(f"Failed to calculate profile completion: {str(e)}")
            return 0.0
    
    def get_profile_completion_details(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed profile completion information"""
        try:
            all_fields = {
                "display_name": "Display Name",
                "bio": "Bio/Description", 
                "location": "Location",
                "phone": "Phone Number",
                "linkedin_url": "LinkedIn Profile",
                "github_url": "GitHub Profile",
                "portfolio_url": "Portfolio Website"
            }
            
            completed = []
            missing = []
            
            for field, label in all_fields.items():
                if profile.get(field):
                    completed.append({"field": field, "label": label})
                else:
                    missing.append({"field": field, "label": label})
            
            percentage = self.calculate_profile_completion(profile)
            
            suggestions = []
            if not profile.get("bio"):
                suggestions.append("Add a professional bio to showcase your background")
            if not profile.get("linkedin_url"):
                suggestions.append("Connect your LinkedIn profile for better networking")
            if not profile.get("location"):
                suggestions.append("Add your location for location-based job recommendations")
            
            return {
                "percentage": percentage,
                "completed": completed,
                "missing": missing,
                "suggestions": suggestions
            }
            
        except Exception as e:
            logger.error(f"Failed to get completion details: {str(e)}")
            return {"percentage": 0.0, "completed": [], "missing": [], "suggestions": []}
    
    async def delete_user_account(self, user_id: str):
        """Delete user account and all associated data"""
        try:
            # Delete user document
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.delete()
            
            # Delete all user's sub-collections
            subcollections = [
                "jobApplications", "favoriteJobs", "interviews", 
                "interviewQuestions", "aiReports", "documents"
            ]
            
            for subcollection in subcollections:
                collection_ref = user_ref.collection(subcollection)
                docs = collection_ref.stream()
                
                for doc in docs:
                    doc.reference.delete()
            
            logger.info(f"Deleted user account for user_id: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete user account: {str(e)}")
            raise
    
    async def _update_login_streak(self, user_id: str):
        """Update user's login streak"""
        try:
            from datetime import date, timedelta
            
            profile = await self.get_user_profile(user_id)
            if not profile:
                return
            
            streaks = profile.get("streaks", {})
            login_streak = streaks.get("login", {"current": 0, "longest": 0, "last_date": None})
            
            today = date.today()
            last_date = login_streak.get("last_date")
            
            if last_date:
                if isinstance(last_date, str):
                    last_date = datetime.fromisoformat(last_date).date()
                elif hasattr(last_date, 'date'):
                    last_date = last_date.date()
            
            if last_date == today:
                # Already logged in today, no change
                return
            elif last_date == today - timedelta(days=1):
                # Consecutive day, increment streak
                login_streak["current"] += 1
            else:
                # Streak broken, reset to 1
                login_streak["current"] = 1
            
            # Update longest streak if needed
            if login_streak["current"] > login_streak["longest"]:
                login_streak["longest"] = login_streak["current"]
            
            login_streak["last_date"] = today.isoformat()
            
            # Update in database
            streaks["login"] = login_streak
            await self.update_user_profile(user_id, {"streaks": streaks})
            
        except Exception as e:
            logger.error(f"Failed to update login streak: {str(e)}")
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email address"""
        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where("email", "==", email).limit(1)
            docs = query.stream()
            
            for doc in docs:
                return doc.to_dict()
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user by email: {str(e)}")
            raise
    
    async def update_user_profile_data(
        self, 
        user_id: str, 
        profile_data: UserProfileUpdate
    ) -> Dict[str, Any]:
        """Update user profile_data field specifically"""
        try:
            # Get current profile to merge with updates
            current_profile = await self.get_user_profile(user_id)
            if not current_profile:
                raise ValueError(f"User {user_id} not found")
            
            # Get current profile_data or initialize empty dict
            current_profile_data = current_profile.get("profile_data", {})
            
            # Merge updates with current data
            update_dict = profile_data.model_dump(exclude_none=True)
            updated_profile_data = {**current_profile_data, **update_dict}
            
            # Update only the profile_data field
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                "profile_data": updated_profile_data,
                "updated_at": datetime.now(timezone.utc)
            })
            
            # Return updated profile
            updated_profile = await self.get_user_profile(user_id)
            logger.info(f"Updated profile_data for user_id: {user_id}")
            return updated_profile
            
        except Exception as e:
            logger.error(f"Failed to update user profile_data: {str(e)}")
            raise
    
    async def update_user_progress(
        self, 
        user_id: str, 
        progress_data: UserProgressUpdate
    ) -> Dict[str, Any]:
        """Update user progress field specifically"""
        try:
            # Get current profile to merge with updates
            current_profile = await self.get_user_profile(user_id)
            if not current_profile:
                raise ValueError(f"User {user_id} not found")
            
            # Get current progress or initialize with defaults
            current_progress = current_profile.get("progress", {
                "xp": 0,
                "level": 1,
                "current_streak": 0,
                "longest_streak": 0,
                "last_activity": datetime.now(timezone.utc)
            })
            
            # Merge updates with current data
            update_dict = progress_data.model_dump(exclude_none=True)
            updated_progress = {**current_progress, **update_dict}
            
            # Ensure last_activity is updated
            if "last_activity" not in update_dict:
                updated_progress["last_activity"] = datetime.now(timezone.utc)
            
            # Update only the progress field
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                "progress": updated_progress,
                "updated_at": datetime.now(timezone.utc)
            })
            
            # Return updated profile
            updated_profile = await self.get_user_profile(user_id)
            logger.info(f"Updated progress for user_id: {user_id}")
            return updated_profile
            
        except Exception as e:
            logger.error(f"Failed to update user progress: {str(e)}")
            raise
    
    async def update_user_settings_data(
        self, 
        user_id: str, 
        settings_data: UserSettingsUpdate
    ) -> Dict[str, Any]:
        """Update user settings field specifically"""
        try:
            # Get current profile to merge with updates
            current_profile = await self.get_user_profile(user_id)
            if not current_profile:
                raise ValueError(f"User {user_id} not found")
            
            # Get current settings or initialize with defaults
            current_settings = current_profile.get("settings", {
                "notifications": {
                    "email": True,
                    "push": True,
                    "interview_reminders": True,
                    "job_alerts": True,
                },
                "privacy": {
                    "profile_visibility": "private",
                    "data_sharing": False,
                },
                "preferences": {
                    "theme": "system",
                    "language": "en",
                },
            })
            
            # Deep merge settings data
            def deep_merge(base: Dict, updates: Dict) -> Dict:
                """Deep merge two dictionaries"""
                result = base.copy()
                for key, value in updates.items():
                    if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                        result[key] = deep_merge(result[key], value)
                    else:
                        result[key] = value
                return result
            
            update_dict = settings_data.model_dump(exclude_none=True)
            updated_settings = deep_merge(current_settings, update_dict)
            
            # Update only the settings field
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_ref.update({
                "settings": updated_settings,
                "updated_at": datetime.now(timezone.utc)
            })
            
            # Return updated profile
            updated_profile = await self.get_user_profile(user_id)
            logger.info(f"Updated settings for user_id: {user_id}")
            return updated_profile
            
        except Exception as e:
            logger.error(f"Failed to update user settings: {str(e)}")
            raise

    async def search_users(
        self, 
        query: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search users by display name or email"""
        try:
            users_ref = self.db.collection(self.users_collection)
            
            # Search by display name (case-insensitive)
            results = []
            
            # Query by display name
            name_query = users_ref.where("display_name", ">=", query).where("display_name", "<=", query + "\uf8ff").limit(limit)
            name_docs = name_query.stream()
            
            for doc in name_docs:
                user_data = doc.to_dict()
                # Only return public profile info
                results.append({
                    "user_id": user_data["user_id"],
                    "display_name": user_data["display_name"],
                    "bio": user_data.get("bio"),
                    "location": user_data.get("location"),
                    "current_level": user_data.get("current_level", 1)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search users: {str(e)}")
            raise
