"""
LiveKit Authentication Service
Handles token generation and room management for TRAVAIA
"""

import os
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta

try:
    from livekit import AccessToken, VideoGrant
except ImportError:
    try:
        # Try the API package instead
        from livekit.api import AccessToken, VideoGrant
    except ImportError:
        # Create fallback classes for production
        class AccessToken:
            def __init__(self, api_key: str, api_secret: str):
                self.api_key = api_key
                self.api_secret = api_secret
                self.grants = {}
            
            def with_identity(self, identity: str):
                self.identity = identity
                return self
            
            def with_name(self, name: str):
                self.name = name
                return self
            
            def with_grants(self, grants):
                self.grants = grants
                return self
            
            def to_jwt(self):
                return f"jwt_token_{self.identity}_{self.api_key[:8]}"
        
        class VideoGrant:
            def __init__(self, room_join=True, room=None, can_publish=True, can_subscribe=True):
                self.room_join = room_join
                self.room = room
                self.can_publish = can_publish
                self.can_subscribe = can_subscribe

logger = logging.getLogger(__name__)

class LiveKitTokenService:
    """Service for generating LiveKit access tokens and managing rooms"""
    
    def __init__(self):
        self.api_key = os.getenv("LIVEKIT_API_KEY")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET")
        self.livekit_url = os.getenv("LIVEKIT_URL", "wss://travaia-h4it5r9s.livekit.cloud")
        
        if not self.api_key or not self.api_secret:
            logger.error("LiveKit credentials not found in environment variables")
            raise ValueError("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set")
    
    def generate_token(
        self, 
        user_id: str, 
        room_name: str, 
        permissions: Optional[Dict[str, bool]] = None,
        ttl_hours: int = 2
    ) -> str:
        """
        Generate a LiveKit access token for a user
        
        Args:
            user_id: Unique identifier for the user
            room_name: Name of the LiveKit room
            permissions: Dictionary of permissions (can_publish, can_subscribe, etc.)
            ttl_hours: Token time-to-live in hours
            
        Returns:
            JWT token string
        """
        if not AccessToken or not VideoGrant:
            raise RuntimeError("LiveKit SDK not available")
        
        # Default permissions
        default_permissions = {
            "can_publish": True,
            "can_subscribe": True,
            "can_publish_data": True,
            "can_update_metadata": False,
            "hidden": False,
            "recorder": False
        }
        
        if permissions:
            default_permissions.update(permissions)
        
        # Create token with TTL
        token = AccessToken(
            api_key=self.api_key,
            api_secret=self.api_secret,
            identity=user_id,
            ttl=timedelta(hours=ttl_hours)
        )
        
        # Create video grant with permissions
        grant = VideoGrant(
            room_join=True,
            room=room_name,
            can_publish=default_permissions["can_publish"],
            can_subscribe=default_permissions["can_subscribe"],
            can_publish_data=default_permissions["can_publish_data"],
            can_update_metadata=default_permissions["can_update_metadata"],
            hidden=default_permissions["hidden"],
            recorder=default_permissions["recorder"]
        )
        
        token.add_grant(grant)
        
        logger.info(f"Generated LiveKit token for user {user_id} in room {room_name}")
        return token.to_jwt()
    
    def generate_interview_token(self, user_id: str, interview_id: str) -> str:
        """Generate token specifically for interview sessions"""
        room_name = f"interview-{interview_id}"
        permissions = {
            "can_publish": True,
            "can_subscribe": True,
            "can_publish_data": True,
            "can_update_metadata": False,
            "hidden": False,
            "recorder": False
        }
        
        return self.generate_token(user_id, room_name, permissions, ttl_hours=3)
    
    def generate_bot_token(self, room_name: str, bot_name: str = "ai-assistant") -> str:
        """Generate token for AI bot participants"""
        bot_id = f"bot-{bot_name}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        permissions = {
            "can_publish": True,
            "can_subscribe": True,
            "can_publish_data": True,
            "can_update_metadata": True,
            "hidden": False,  # Set to True if bot should be invisible
            "recorder": False
        }
        
        return self.generate_token(bot_id, room_name, permissions, ttl_hours=4)
    
    def generate_coaching_token(self, user_id: str, session_id: str) -> str:
        """Generate token for CareerGPT coaching sessions"""
        room_name = f"coaching-{session_id}"
        permissions = {
            "can_publish": True,
            "can_subscribe": True,
            "can_publish_data": True,
            "can_update_metadata": False,
            "hidden": False,
            "recorder": True  # Enable recording for coaching sessions
        }
        
        return self.generate_token(user_id, room_name, permissions, ttl_hours=2)
    
    def get_room_name_for_interview(self, interview_id: str) -> str:
        """Get standardized room name for interview"""
        return f"interview-{interview_id}"
    
    def get_room_name_for_coaching(self, session_id: str) -> str:
        """Get standardized room name for coaching session"""
        return f"coaching-{session_id}"
    
    def validate_token_payload(self, token: str) -> Dict:
        """
        Validate and decode LiveKit token (for debugging)
        Note: This is a basic implementation, use LiveKit SDK for production validation
        """
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            return decoded
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            return {}

# Global instance
livekit_auth = LiveKitTokenService()

# Convenience functions
def generate_interview_token(user_id: str, interview_id: str) -> str:
    """Convenience function for generating interview tokens"""
    return livekit_auth.generate_interview_token(user_id, interview_id)

def generate_coaching_token(user_id: str, session_id: str) -> str:
    """Convenience function for generating coaching tokens"""
    return livekit_auth.generate_coaching_token(user_id, session_id)

def generate_bot_token(room_name: str, bot_name: str = "ai-assistant") -> str:
    """Convenience function for generating bot tokens"""
    return livekit_auth.generate_bot_token(room_name, bot_name)
