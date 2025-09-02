"""
Gamification Service for TRAVAIA User & Authentication Service
Handles XP, levels, achievements, streaks, and user progress tracking
"""

import firebase_admin
from firebase_admin import firestore
from datetime import datetime, timezone, date, timedelta
from typing import Dict, Any, Optional, List
import logging
import random
import math

logger = logging.getLogger(__name__)

class GamificationService:
    def __init__(self):
        """Initialize GamificationService with Firestore client"""
        self.db = firestore.client()
        self.users_collection = "users"
        
        # XP values for different activities
        self.xp_values = {
            "interview_completed": 50,
            "application_added": 20,
            "profile_updated": 10,
            "document_uploaded": 15,
            "skill_assessed": 25,
            "daily_login": 5,
            "streak_bonus": 10,
            "achievement_unlocked": 100
        }
        
        # Level thresholds (XP required for each level)
        self.level_thresholds = [
            0, 100, 250, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000,
            13000, 16500, 20500, 25000, 30000, 35500, 41500, 48000, 55000, 62500
        ]
        
        # Achievement definitions
        self.achievements = {
            "first_interview": {
                "name": "Interview Rookie",
                "description": "Complete your first mock interview",
                "type": "interview_milestone",
                "icon": "🎤",
                "xp_reward": 50,
                "rarity": "common",
                "requirements": {"interviews_completed": 1}
            },
            "interview_master": {
                "name": "Interview Master",
                "description": "Complete 10 mock interviews",
                "type": "interview_milestone", 
                "icon": "🏆",
                "xp_reward": 200,
                "rarity": "rare",
                "requirements": {"interviews_completed": 10}
            },
            "application_starter": {
                "name": "Job Hunter",
                "description": "Add your first job application",
                "type": "application_milestone",
                "icon": "📝",
                "xp_reward": 30,
                "rarity": "common",
                "requirements": {"applications_added": 1}
            },
            "application_pro": {
                "name": "Application Pro",
                "description": "Track 25 job applications",
                "type": "application_milestone",
                "icon": "📊",
                "xp_reward": 150,
                "rarity": "rare",
                "requirements": {"applications_added": 25}
            },
            "streak_warrior": {
                "name": "Streak Warrior",
                "description": "Maintain a 7-day login streak",
                "type": "streak_milestone",
                "icon": "🔥",
                "xp_reward": 100,
                "rarity": "rare",
                "requirements": {"login_streak": 7}
            },
            "profile_perfectionist": {
                "name": "Profile Perfectionist",
                "description": "Complete 100% of your profile",
                "type": "profile_completion",
                "icon": "✨",
                "xp_reward": 75,
                "rarity": "uncommon",
                "requirements": {"profile_completion": 1.0}
            }
        }
    
    async def get_user_gamification_stats(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive gamification statistics for user"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise Exception("User not found")
            
            user_data = user_doc.to_dict()
            
            # Get level information
            level_info = self._calculate_level_info(user_data.get("total_xp", 0))
            
            # Get achievements
            user_achievements = await self._get_user_achievements_with_progress(user_id, user_data)
            
            # Get streaks
            streaks = self._format_streaks(user_data.get("streaks", {}))
            
            # Get recent activities
            recent_activities = await self._get_recent_activities(user_id)
            
            # Calculate rank percentile
            rank_percentile = await self._calculate_rank_percentile(user_id, user_data.get("total_xp", 0))
            
            return {
                "user_id": user_id,
                "level": level_info,
                "achievements": user_achievements,
                "streaks": streaks,
                "total_achievements": len([a for a in user_achievements if a.get("unlocked_at")]),
                "completion_rate": len([a for a in user_achievements if a.get("unlocked_at")]) / len(user_achievements),
                "rank_percentile": rank_percentile,
                "recent_activities": recent_activities
            }
            
        except Exception as e:
            logger.error(f"Failed to get gamification stats: {str(e)}")
            raise
    
    async def get_user_level(self, user_id: str) -> Dict[str, Any]:
        """Get user's current level and XP information"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise Exception("User not found")
            
            user_data = user_doc.to_dict()
            total_xp = user_data.get("total_xp", 0)
            
            return self._calculate_level_info(total_xp)
            
        except Exception as e:
            logger.error(f"Failed to get user level: {str(e)}")
            raise
    
    async def record_activity(
        self, 
        user_id: str, 
        activity_type: str, 
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Record user activity and award XP"""
        try:
            if activity_type not in self.xp_values:
                raise ValueError(f"Unknown activity type: {activity_type}")
            
            base_xp = self.xp_values[activity_type]
            bonus_multiplier = 1.0
            
            # Calculate streak bonuses
            if activity_type == "daily_login":
                bonus_multiplier = await self._calculate_login_bonus(user_id)
            
            xp_gained = int(base_xp * bonus_multiplier)
            
            # Update user XP
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise Exception("User not found")
            
            user_data = user_doc.to_dict()
            new_total_xp = user_data.get("total_xp", 0) + xp_gained
            
            # Check for level up
            old_level = self._calculate_level_info(user_data.get("total_xp", 0))["current_level"]
            new_level = self._calculate_level_info(new_total_xp)["current_level"]
            
            # Update user data
            update_data = {
                "total_xp": new_total_xp,
                "current_level": new_level,
                "updated_at": datetime.now(timezone.utc)
            }
            
            user_ref.update(update_data)
            
            # Record activity in user's activity log
            await self._record_activity_log(user_id, activity_type, xp_gained, metadata)
            
            # Check for achievements
            await self._check_and_unlock_achievements(user_id, activity_type, metadata)
            
            result = {
                "activity_type": activity_type,
                "xp_gained": xp_gained,
                "bonus_multiplier": bonus_multiplier,
                "reason": f"Completed {activity_type.replace('_', ' ')}",
                "timestamp": datetime.now(timezone.utc),
                "level_up": new_level > old_level,
                "new_level": new_level if new_level > old_level else None
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to record activity: {str(e)}")
            raise
    
    async def get_user_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all user achievements (unlocked and locked)"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise Exception("User not found")
            
            user_data = user_doc.to_dict()
            return await self._get_user_achievements_with_progress(user_id, user_data)
            
        except Exception as e:
            logger.error(f"Failed to get user achievements: {str(e)}")
            raise
    
    async def get_unlocked_achievements(self, user_id: str) -> List[Dict[str, Any]]:
        """Get only unlocked achievements"""
        try:
            achievements = await self.get_user_achievements(user_id)
            return [a for a in achievements if a.get("unlocked_at")]
            
        except Exception as e:
            logger.error(f"Failed to get unlocked achievements: {str(e)}")
            raise
    
    async def get_user_streaks(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all user streaks"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise Exception("User not found")
            
            user_data = user_doc.to_dict()
            streaks_data = user_data.get("streaks", {})
            
            return self._format_streaks(streaks_data)
            
        except Exception as e:
            logger.error(f"Failed to get user streaks: {str(e)}")
            raise
    
    def _calculate_level_info(self, total_xp: int) -> Dict[str, Any]:
        """Calculate level information from total XP"""
        current_level = 1
        
        for level, threshold in enumerate(self.level_thresholds):
            if total_xp >= threshold:
                current_level = level + 1
            else:
                break
        
        # XP for next level
        if current_level < len(self.level_thresholds):
            xp_to_next = self.level_thresholds[current_level] - total_xp
        else:
            xp_to_next = 0  # Max level reached
        
        # Level names
        level_names = {
            1: "Newcomer", 2: "Explorer", 3: "Apprentice", 4: "Practitioner", 5: "Specialist",
            6: "Expert", 7: "Master", 8: "Veteran", 9: "Elite", 10: "Champion",
            11: "Legend", 12: "Mythic", 13: "Immortal", 14: "Transcendent", 15: "Godlike"
        }
        
        level_name = level_names.get(min(current_level, 15), f"Level {current_level}")
        
        # Level benefits
        benefits = []
        if current_level >= 5:
            benefits.append("Advanced interview analytics")
        if current_level >= 10:
            benefits.append("Priority customer support")
        if current_level >= 15:
            benefits.append("Exclusive career coaching sessions")
        
        return {
            "current_level": current_level,
            "current_xp": total_xp,
            "xp_to_next_level": xp_to_next,
            "total_xp": total_xp,
            "level_name": level_name,
            "level_benefits": benefits
        }
    
    def _format_streaks(self, streaks_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Format streaks data for API response"""
        formatted_streaks = []
        
        for streak_type, streak_info in streaks_data.items():
            last_date = streak_info.get("last_date")
            if last_date and isinstance(last_date, str):
                last_date = datetime.fromisoformat(last_date).date()
            elif hasattr(last_date, 'date'):
                last_date = last_date.date()
            
            # Check if streak is still active (within last 2 days)
            is_active = False
            if last_date:
                days_since = (date.today() - last_date).days
                is_active = days_since <= 1
            
            formatted_streaks.append({
                "type": streak_type,
                "current_streak": streak_info.get("current", 0),
                "longest_streak": streak_info.get("longest", 0),
                "last_activity_date": last_date,
                "is_active": is_active
            })
        
        return formatted_streaks
    
    async def _get_user_achievements_with_progress(
        self, 
        user_id: str, 
        user_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get user achievements with progress calculation"""
        user_achievements = user_data.get("achievements", [])
        achievements_list = []
        
        # Get user stats for progress calculation
        user_stats = await self._get_user_stats(user_id)
        
        for achievement_id, achievement_def in self.achievements.items():
            # Check if user has unlocked this achievement
            unlocked_achievement = next(
                (a for a in user_achievements if a.get("id") == achievement_id), 
                None
            )
            
            # Calculate progress
            progress = self._calculate_achievement_progress(achievement_def, user_stats)
            
            achievement_data = {
                "id": achievement_id,
                "name": achievement_def["name"],
                "description": achievement_def["description"],
                "type": achievement_def["type"],
                "icon": achievement_def["icon"],
                "xp_reward": achievement_def["xp_reward"],
                "rarity": achievement_def["rarity"],
                "unlocked_at": unlocked_achievement.get("unlocked_at") if unlocked_achievement else None,
                "progress": min(progress, 1.0),
                "requirements": achievement_def["requirements"]
            }
            
            achievements_list.append(achievement_data)
        
        return achievements_list
    
    async def _get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics for achievement progress calculation"""
        try:
            # Get counts from user's sub-collections
            user_ref = self.db.collection(self.users_collection).document(user_id)
            
            # Count interviews
            interviews_count = len(list(user_ref.collection("interviews").stream()))
            
            # Count applications
            applications_count = len(list(user_ref.collection("jobApplications").stream()))
            
            # Get user profile data
            user_doc = user_ref.get()
            user_data = user_doc.to_dict() if user_doc.exists else {}
            
            # Calculate profile completion
            from services.user_service import UserService
            user_service = UserService()
            profile_completion = user_service.calculate_profile_completion(user_data)
            
            # Get login streak
            login_streak = user_data.get("streaks", {}).get("login", {}).get("current", 0)
            
            return {
                "interviews_completed": interviews_count,
                "applications_added": applications_count,
                "profile_completion": profile_completion,
                "login_streak": login_streak,
                "total_xp": user_data.get("total_xp", 0)
            }
            
        except Exception as e:
            logger.error(f"Failed to get user stats: {str(e)}")
            return {}
    
    def _calculate_achievement_progress(
        self, 
        achievement_def: Dict[str, Any], 
        user_stats: Dict[str, Any]
    ) -> float:
        """Calculate progress toward an achievement"""
        requirements = achievement_def["requirements"]
        progress = 0.0
        
        for req_key, req_value in requirements.items():
            user_value = user_stats.get(req_key, 0)
            progress = max(progress, min(user_value / req_value, 1.0))
        
        return progress
    
    async def _check_and_unlock_achievements(
        self, 
        user_id: str, 
        activity_type: str, 
        metadata: Dict[str, Any] = None
    ):
        """Check and unlock achievements based on user activity"""
        try:
            user_stats = await self._get_user_stats(user_id)
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            user_data = user_doc.to_dict()
            
            current_achievements = user_data.get("achievements", [])
            unlocked_ids = [a.get("id") for a in current_achievements]
            
            new_achievements = []
            
            for achievement_id, achievement_def in self.achievements.items():
                if achievement_id in unlocked_ids:
                    continue
                
                # Check if requirements are met
                requirements_met = True
                for req_key, req_value in achievement_def["requirements"].items():
                    if user_stats.get(req_key, 0) < req_value:
                        requirements_met = False
                        break
                
                if requirements_met:
                    # Unlock achievement
                    new_achievement = {
                        "id": achievement_id,
                        "unlocked_at": datetime.now(timezone.utc),
                        "xp_awarded": achievement_def["xp_reward"]
                    }
                    new_achievements.append(new_achievement)
                    
                    # Award XP for achievement
                    current_xp = user_data.get("total_xp", 0)
                    new_total_xp = current_xp + achievement_def["xp_reward"]
                    
                    user_ref.update({
                        "total_xp": new_total_xp,
                        "achievements": current_achievements + [new_achievement]
                    })
                    
                    logger.info(f"Unlocked achievement {achievement_id} for user {user_id}")
            
            return new_achievements
            
        except Exception as e:
            logger.error(f"Failed to check achievements: {str(e)}")
            return []
    
    async def _record_activity_log(
        self, 
        user_id: str, 
        activity_type: str, 
        xp_gained: int, 
        metadata: Dict[str, Any] = None
    ):
        """Record activity in user's activity log"""
        try:
            activity_data = {
                "activity_type": activity_type,
                "xp_gained": xp_gained,
                "timestamp": datetime.now(timezone.utc),
                "metadata": metadata or {}
            }
            
            # Add to user's activity log sub-collection
            user_ref = self.db.collection(self.users_collection).document(user_id)
            activity_ref = user_ref.collection("activityLog").document()
            activity_ref.set(activity_data)
            
        except Exception as e:
            logger.error(f"Failed to record activity log: {str(e)}")
    
    async def _get_recent_activities(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's recent activities"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            activities_ref = user_ref.collection("activityLog")
            
            # Get recent activities ordered by timestamp
            query = activities_ref.order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit)
            activities = query.stream()
            
            return [activity.to_dict() for activity in activities]
            
        except Exception as e:
            logger.error(f"Failed to get recent activities: {str(e)}")
            return []
    
    async def _calculate_login_bonus(self, user_id: str) -> float:
        """Calculate login streak bonus multiplier"""
        try:
            user_ref = self.db.collection(self.users_collection).document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return 1.0
            
            user_data = user_doc.to_dict()
            login_streak = user_data.get("streaks", {}).get("login", {}).get("current", 0)
            
            # Bonus multiplier based on streak
            if login_streak >= 30:
                return 3.0
            elif login_streak >= 14:
                return 2.5
            elif login_streak >= 7:
                return 2.0
            elif login_streak >= 3:
                return 1.5
            else:
                return 1.0
                
        except Exception as e:
            logger.error(f"Failed to calculate login bonus: {str(e)}")
            return 1.0
    
    async def _calculate_rank_percentile(self, user_id: str, user_xp: int) -> float:
        """Calculate user's rank percentile among all users"""
        try:
            # Get all users with lower XP
            users_ref = self.db.collection(self.users_collection)
            lower_xp_query = users_ref.where("total_xp", "<", user_xp)
            lower_xp_count = len(list(lower_xp_query.stream()))
            
            # Get total user count
            total_users_count = len(list(users_ref.stream()))
            
            if total_users_count == 0:
                return 100.0
            
            percentile = (lower_xp_count / total_users_count) * 100
            return round(percentile, 1)
            
        except Exception as e:
            logger.error(f"Failed to calculate rank percentile: {str(e)}")
            return 0.0
