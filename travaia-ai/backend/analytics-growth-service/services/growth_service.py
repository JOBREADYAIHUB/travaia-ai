"""
Growth Service - Viral growth and referral management
Handles referral programs, social sharing, and viral growth features
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import firestore
import asyncio

logger = structlog.get_logger(__name__)

class GrowthService:
    """Enterprise viral growth service"""
    
    def __init__(self):
        # Initialize Firestore
        self.db = firestore.Client()
        self.referrals_collection = "referrals"
        self.growth_metrics_collection = "growth_metrics"
        
        logger.info("Growth service initialized")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def create_referral_code(self, user_id: str) -> Dict[str, Any]:
        """Create unique referral code for user"""
        try:
            referral_code = f"TRAV-{str(uuid.uuid4())[:8].upper()}"
            timestamp = datetime.utcnow()
            
            # Check if user already has a referral code
            existing_query = (
                self.db.collection(self.referrals_collection)
                .where("referrer_id", "==", user_id)
                .where("is_active", "==", True)
                .limit(1)
            )
            
            existing_docs = await asyncio.to_thread(existing_query.get)
            
            if existing_docs:
                # Return existing code
                existing_doc = existing_docs[0].to_dict()
                logger.info("Returning existing referral code", user_id=user_id, code=existing_doc["referral_code"])
                return existing_doc
            
            # Create new referral code
            referral_doc = {
                "referral_id": str(uuid.uuid4()),
                "referrer_id": user_id,
                "referral_code": referral_code,
                "created_at": timestamp,
                "is_active": True,
                "total_referrals": 0,
                "successful_referrals": 0,
                "total_rewards": 0
            }
            
            await asyncio.to_thread(
                self.db.collection(self.referrals_collection).document(referral_doc["referral_id"]).set,
                referral_doc
            )
            
            logger.info("Referral code created", user_id=user_id, code=referral_code)
            return referral_doc
            
        except Exception as e:
            logger.error("Referral code creation failed", error=str(e))
            raise Exception(f"Failed to create referral code: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def process_referral(self, referral_code: str, new_user_id: str) -> Dict[str, Any]:
        """Process new user referral"""
        try:
            # Find referral code
            query = (
                self.db.collection(self.referrals_collection)
                .where("referral_code", "==", referral_code)
                .where("is_active", "==", True)
                .limit(1)
            )
            
            docs = await asyncio.to_thread(query.get)
            
            if not docs:
                return {"success": False, "message": "Invalid referral code"}
            
            referral_doc = docs[0]
            referral_data = referral_doc.to_dict()
            referrer_id = referral_data["referrer_id"]
            
            # Check if user is trying to refer themselves
            if referrer_id == new_user_id:
                return {"success": False, "message": "Cannot refer yourself"}
            
            # Create referral record
            referral_record = {
                "referral_record_id": str(uuid.uuid4()),
                "referrer_id": referrer_id,
                "referred_user_id": new_user_id,
                "referral_code": referral_code,
                "referral_date": datetime.utcnow(),
                "status": "pending",  # pending, completed, failed
                "reward_amount": 10,  # Default reward
                "reward_given": False
            }
            
            # Save referral record
            await asyncio.to_thread(
                self.db.collection("referral_records").document(referral_record["referral_record_id"]).set,
                referral_record
            )
            
            # Update referral stats
            await asyncio.to_thread(
                referral_doc.reference.update,
                {
                    "total_referrals": firestore.Increment(1),
                    "updated_at": datetime.utcnow()
                }
            )
            
            logger.info("Referral processed", referrer_id=referrer_id, new_user_id=new_user_id, code=referral_code)
            return {
                "success": True,
                "message": "Referral processed successfully",
                "referral_record": referral_record
            }
            
        except Exception as e:
            logger.error("Referral processing failed", error=str(e))
            return {"success": False, "message": str(e)}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def complete_referral(self, referral_record_id: str) -> bool:
        """Mark referral as completed and give rewards"""
        try:
            # Get referral record
            doc_ref = self.db.collection("referral_records").document(referral_record_id)
            doc = await asyncio.to_thread(doc_ref.get)
            
            if not doc.exists:
                return False
            
            record_data = doc.to_dict()
            
            if record_data.get("status") != "pending":
                return False  # Already processed
            
            # Update referral record
            await asyncio.to_thread(
                doc_ref.update,
                {
                    "status": "completed",
                    "completion_date": datetime.utcnow(),
                    "reward_given": True
                }
            )
            
            # Update referrer stats
            referrer_query = (
                self.db.collection(self.referrals_collection)
                .where("referrer_id", "==", record_data["referrer_id"])
                .where("is_active", "==", True)
                .limit(1)
            )
            
            referrer_docs = await asyncio.to_thread(referrer_query.get)
            
            if referrer_docs:
                referrer_doc = referrer_docs[0]
                await asyncio.to_thread(
                    referrer_doc.reference.update,
                    {
                        "successful_referrals": firestore.Increment(1),
                        "total_rewards": firestore.Increment(record_data.get("reward_amount", 10)),
                        "updated_at": datetime.utcnow()
                    }
                )
            
            # TODO: Integrate with user service to give actual rewards (XP, badges, etc.)
            
            logger.info("Referral completed", referral_record_id=referral_record_id)
            return True
            
        except Exception as e:
            logger.error("Referral completion failed", error=str(e))
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_referral_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user's referral statistics"""
        try:
            # Get referral code info
            referral_query = (
                self.db.collection(self.referrals_collection)
                .where("referrer_id", "==", user_id)
                .where("is_active", "==", True)
                .limit(1)
            )
            
            referral_docs = await asyncio.to_thread(referral_query.get)
            
            if not referral_docs:
                return {"user_id": user_id, "has_referral_code": False}
            
            referral_data = referral_docs[0].to_dict()
            
            # Get referral records
            records_query = (
                self.db.collection("referral_records")
                .where("referrer_id", "==", user_id)
                .order_by("referral_date", direction=firestore.Query.DESCENDING)
            )
            
            records_docs = await asyncio.to_thread(records_query.get)
            records = [doc.to_dict() for doc in records_docs]
            
            stats = {
                "user_id": user_id,
                "has_referral_code": True,
                "referral_code": referral_data["referral_code"],
                "total_referrals": referral_data.get("total_referrals", 0),
                "successful_referrals": referral_data.get("successful_referrals", 0),
                "total_rewards": referral_data.get("total_rewards", 0),
                "recent_referrals": records[:10],  # Last 10 referrals
                "conversion_rate": 0
            }
            
            # Calculate conversion rate
            if stats["total_referrals"] > 0:
                stats["conversion_rate"] = round(
                    (stats["successful_referrals"] / stats["total_referrals"]) * 100, 2
                )
            
            logger.info("Referral stats retrieved", user_id=user_id, total=stats["total_referrals"])
            return stats
            
        except Exception as e:
            logger.error("Referral stats retrieval failed", error=str(e))
            return {"error": str(e)}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def track_social_share(self, user_id: str, platform: str, content_type: str, content_id: str) -> bool:
        """Track social media sharing for viral growth"""
        try:
            share_record = {
                "share_id": str(uuid.uuid4()),
                "user_id": user_id,
                "platform": platform,  # linkedin, twitter, facebook, etc.
                "content_type": content_type,  # interview_result, job_match, achievement
                "content_id": content_id,
                "share_date": datetime.utcnow(),
                "clicks": 0,
                "conversions": 0
            }
            
            await asyncio.to_thread(
                self.db.collection("social_shares").document(share_record["share_id"]).set,
                share_record
            )
            
            # Update user's sharing stats
            await self._update_user_sharing_stats(user_id, platform)
            
            logger.info("Social share tracked", user_id=user_id, platform=platform, content_type=content_type)
            return True
            
        except Exception as e:
            logger.error("Social share tracking failed", error=str(e))
            return False

    async def _update_user_sharing_stats(self, user_id: str, platform: str):
        """Update user's social sharing statistics"""
        try:
            stats_doc_id = f"{user_id}_sharing_stats"
            doc_ref = self.db.collection("user_sharing_stats").document(stats_doc_id)
            
            # Get existing stats
            doc = await asyncio.to_thread(doc_ref.get)
            
            if doc.exists:
                # Update existing
                await asyncio.to_thread(
                    doc_ref.update,
                    {
                        f"platforms.{platform}": firestore.Increment(1),
                        "total_shares": firestore.Increment(1),
                        "last_share_date": datetime.utcnow()
                    }
                )
            else:
                # Create new
                stats_doc = {
                    "user_id": user_id,
                    "total_shares": 1,
                    "platforms": {platform: 1},
                    "first_share_date": datetime.utcnow(),
                    "last_share_date": datetime.utcnow()
                }
                await asyncio.to_thread(doc_ref.set, stats_doc)
            
        except Exception as e:
            logger.error("User sharing stats update failed", error=str(e))

    async def get_viral_coefficient(self, days: int = 30) -> Dict[str, Any]:
        """Calculate platform viral coefficient"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get all referral records in period
            records_query = (
                self.db.collection("referral_records")
                .where("referral_date", ">=", start_date)
                .where("referral_date", "<=", end_date)
            )
            
            records_docs = await asyncio.to_thread(records_query.get)
            records = [doc.to_dict() for doc in records_docs]
            
            # Get unique referrers
            referrers = set(record["referrer_id"] for record in records)
            total_referrers = len(referrers)
            total_referrals = len(records)
            successful_referrals = len([r for r in records if r.get("status") == "completed"])
            
            # Calculate viral coefficient
            viral_coefficient = 0
            if total_referrers > 0:
                viral_coefficient = total_referrals / total_referrers
            
            return {
                "period_days": days,
                "total_referrers": total_referrers,
                "total_referrals": total_referrals,
                "successful_referrals": successful_referrals,
                "viral_coefficient": round(viral_coefficient, 3),
                "conversion_rate": round((successful_referrals / max(1, total_referrals)) * 100, 2)
            }
            
        except Exception as e:
            logger.error("Viral coefficient calculation failed", error=str(e))
            return {"error": str(e)}