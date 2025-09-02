"""
Authentication Service for TRAVAIA User & Authentication Service
Handles Firebase Authentication operations and token management
"""

import firebase_admin
from firebase_admin import auth, credentials
from typing import Dict, Any, Optional
import logging
import os
import requests
import json
import sys

# Add shared directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from firebase_config import cloud_config

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self):
        """Initialize AuthService using centralized cloud config"""
        self.cloud_config = cloud_config
        self.project_id = self.cloud_config.project_id
        self._firebase_available = self.cloud_config.firebase_available
        
        # Firebase configuration matching frontend
        self.firebase_api_key = os.getenv("FIREBASE_API_KEY", "AIzaSyAUW3xyiVdv2F5un5YzRjqJdz8FKpZZJr0")
        self.auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts"
        
        logger.info(f"AuthService initialized - Firebase available: {self._firebase_available}")
    
    async def create_user(
        self, 
        email: str, 
        password: str, 
        display_name: str
    ) -> auth.UserRecord:
        """Create a new Firebase user"""
        try:
            if not self._firebase_available:
                raise Exception("Firebase Admin SDK not available")
                
            user = auth.create_user(
                email=email,
                password=password,
                display_name=display_name,
                email_verified=False
            )
            
            logger.info(f"Created Firebase user: {user.uid}")
            return user
            
        except Exception as e:
            logger.error(f"Failed to create Firebase user: {str(e)}")
            raise
    
    async def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password using Firebase REST API"""
        try:
            if not self._firebase_available:
                return {
                    "access_token": "service_unavailable",
                    "refresh_token": "service_unavailable",
                    "user_id": "temp_user",
                    "expires_in": 3600
                }
            
            if not self.firebase_api_key:
                raise ValueError("Firebase API key not configured")
            
            # Use Firebase REST API for email/password authentication
            url = f"{self.auth_url}:signInWithPassword?key={self.firebase_api_key}"
            
            payload = {
                "email": email,
                "password": password,
                "returnSecureToken": True
            }
            
            response = requests.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "access_token": data["idToken"],
                    "refresh_token": data["refreshToken"],
                    "user_id": data["localId"],
                    "expires_in": int(data["expiresIn"])
                }
            else:
                error_data = response.json()
                error_message = error_data.get("error", {}).get("message", "Authentication failed")
                raise Exception(error_message)
                
        except Exception as e:
            logger.error(f"Failed to authenticate user: {str(e)}")
            raise
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Firebase ID token"""
        try:
            if not self._firebase_available:
                return {
                    "uid": "temp_user",
                    "email": "service@unavailable.com",
                    "email_verified": False,
                    "name": "Service Unavailable"
                }
            
            decoded_token = auth.verify_id_token(token)
            return decoded_token
            
        except Exception as e:
            logger.error(f"Failed to verify token: {str(e)}")
            raise
    
    async def refresh_user_token(self, user_id: str) -> str:
        """Generate a new custom token for user"""
        try:
            if not self._firebase_available:
                return "service_unavailable_token"
            
            # Generate custom token
            custom_token = auth.create_custom_token(user_id)
            
            # Exchange custom token for ID token
            url = f"{self.auth_url}:signInWithCustomToken?key={self.firebase_api_key}"
            
            payload = {
                "token": custom_token.decode('utf-8'),
                "returnSecureToken": True
            }
            
            response = requests.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                return data["idToken"]
            else:
                raise Exception("Failed to refresh token")
                
        except Exception as e:
            logger.error(f"Failed to refresh token: {str(e)}")
            raise
    
    async def revoke_user_tokens(self, user_id: str):
        """Revoke all refresh tokens for a user"""
        try:
            auth.revoke_refresh_tokens(user_id)
            logger.info(f"Revoked tokens for user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to revoke tokens: {str(e)}")
            raise
    
    async def send_email_verification(self, user_id: str):
        """Send email verification to user"""
        try:
            # Get user record
            user = auth.get_user(user_id)
            
            # Generate email verification link
            link = auth.generate_email_verification_link(user.email)
            
            # In a real implementation, you would send this link via email
            # For now, we'll just log it
            logger.info(f"Email verification link for {user.email}: {link}")
            
            return {"message": "Email verification sent", "link": link}
            
        except Exception as e:
            logger.error(f"Failed to send email verification: {str(e)}")
            raise
    
    async def send_password_reset_email(self, email: str):
        """Send password reset email"""
        try:
            # Generate password reset link
            link = auth.generate_password_reset_link(email)
            
            # In a real implementation, you would send this link via email
            # For now, we'll just log it
            logger.info(f"Password reset link for {email}: {link}")
            
            return {"message": "Password reset email sent", "link": link}
            
        except Exception as e:
            logger.error(f"Failed to send password reset email: {str(e)}")
            raise
    
    async def update_user_email(self, user_id: str, new_email: str):
        """Update user's email address"""
        try:
            auth.update_user(user_id, email=new_email, email_verified=False)
            logger.info(f"Updated email for user {user_id} to {new_email}")
            
        except Exception as e:
            logger.error(f"Failed to update user email: {str(e)}")
            raise
    
    async def update_user_password(self, user_id: str, new_password: str):
        """Update user's password"""
        try:
            auth.update_user(user_id, password=new_password)
            logger.info(f"Updated password for user {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to update user password: {str(e)}")
            raise
    
    async def delete_user(self, user_id: str):
        """Delete Firebase user account"""
        try:
            auth.delete_user(user_id)
            logger.info(f"Deleted Firebase user: {user_id}")
            
        except Exception as e:
            logger.error(f"Failed to delete Firebase user: {str(e)}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[auth.UserRecord]:
        """Get Firebase user by email"""
        try:
            user = auth.get_user_by_email(email)
            return user
            
        except auth.UserNotFoundError:
            return None
        except Exception as e:
            logger.error(f"Failed to get user by email: {str(e)}")
            raise
    
    async def verify_email_verification_link(self, oob_code: str):
        """Verify email verification link"""
        try:
            # Apply email verification
            auth.apply_action_code(oob_code)
            logger.info("Email verification applied successfully")
            
            return {"message": "Email verified successfully"}
            
        except Exception as e:
            logger.error(f"Failed to verify email: {str(e)}")
            raise
    
    async def confirm_password_reset(self, oob_code: str, new_password: str):
        """Confirm password reset with new password"""
        try:
            # Confirm password reset
            auth.confirm_password_reset(oob_code, new_password)
            logger.info("Password reset confirmed successfully")
            
            return {"message": "Password reset successfully"}
            
        except Exception as e:
            logger.error(f"Failed to confirm password reset: {str(e)}")
            raise
    
    async def create_custom_claims(self, user_id: str, claims: Dict[str, Any]):
        """Set custom claims for a user"""
        try:
            auth.set_custom_user_claims(user_id, claims)
            logger.info(f"Set custom claims for user {user_id}: {claims}")
            
        except Exception as e:
            logger.error(f"Failed to set custom claims: {str(e)}")
            raise
    
    async def get_user_claims(self, user_id: str) -> Dict[str, Any]:
        """Get custom claims for a user"""
        try:
            user = auth.get_user(user_id)
            return user.custom_claims or {}
            
        except Exception as e:
            logger.error(f"Failed to get user claims: {str(e)}")
            raise
