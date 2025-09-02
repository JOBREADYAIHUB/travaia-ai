"""
Analytics Service - Enterprise analytics with BigQuery integration
Handles user analytics, performance metrics, and business intelligence
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import firestore, bigquery
import pandas as pd
import asyncio

logger = structlog.get_logger(__name__)

class AnalyticsService:
    """Enterprise analytics service with BigQuery integration"""
    
    def __init__(self):
        # Initialize Firestore
        self.db = firestore.Client()
        
        # Initialize BigQuery
        try:
            self.bq_client = bigquery.Client()
            self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
            self.dataset_id = "travaia_analytics"
            self.bigquery_enabled = True
            
            # Ensure dataset exists
            self._ensure_dataset_exists()
        except Exception as e:
            logger.warning("BigQuery not available", error=str(e))
            self.bigquery_enabled = False
        
        logger.info("Analytics service initialized", bigquery_enabled=self.bigquery_enabled)

    def _ensure_dataset_exists(self):
        """Ensure BigQuery dataset exists"""
        try:
            dataset_ref = self.bq_client.dataset(self.dataset_id)
            self.bq_client.get_dataset(dataset_ref)
        except Exception:
            # Create dataset if it doesn't exist
            dataset = bigquery.Dataset(f"{self.project_id}.{self.dataset_id}")
            dataset.location = "US"
            self.bq_client.create_dataset(dataset)
            logger.info("BigQuery dataset created", dataset_id=self.dataset_id)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def track_user_event(self, event_data: Dict[str, Any]) -> bool:
        """Track user event for analytics"""
        try:
            event_id = str(uuid.uuid4())
            timestamp = datetime.utcnow()
            
            # Prepare event document
            event_doc = {
                "event_id": event_id,
                "user_id": event_data["user_id"],
                "event_type": event_data["event_type"],
                "event_data": event_data.get("event_data", {}),
                "timestamp": timestamp,
                "session_id": event_data.get("session_id"),
                "user_agent": event_data.get("user_agent"),
                "ip_address": event_data.get("ip_address")
            }
            
            # Save to Firestore for real-time access
            await asyncio.to_thread(
                self.db.collection("user_events").document(event_id).set,
                event_doc
            )
            
            # Send to BigQuery for analytics
            if self.bigquery_enabled:
                await self._send_to_bigquery("user_events", event_doc)
            
            logger.info("User event tracked", event_id=event_id, event_type=event_data["event_type"])
            return True
            
        except Exception as e:
            logger.error("Event tracking failed", error=str(e))
            return False

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_user_analytics(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get user analytics for specified period"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Query user events
            query = (
                self.db.collection("user_events")
                .where("user_id", "==", user_id)
                .where("timestamp", ">=", start_date)
                .where("timestamp", "<=", end_date)
                .order_by("timestamp", direction=firestore.Query.DESCENDING)
            )
            
            docs = await asyncio.to_thread(query.get)
            events = [doc.to_dict() for doc in docs]
            
            # Calculate analytics
            analytics = {
                "user_id": user_id,
                "period_days": days,
                "total_events": len(events),
                "event_breakdown": {},
                "daily_activity": {},
                "most_active_day": None,
                "session_count": len(set(e.get("session_id") for e in events if e.get("session_id")))
            }
            
            # Event type breakdown
            for event in events:
                event_type = event.get("event_type", "unknown")
                analytics["event_breakdown"][event_type] = analytics["event_breakdown"].get(event_type, 0) + 1
            
            # Daily activity
            for event in events:
                day = event["timestamp"].date().isoformat()
                analytics["daily_activity"][day] = analytics["daily_activity"].get(day, 0) + 1
            
            # Most active day
            if analytics["daily_activity"]:
                analytics["most_active_day"] = max(analytics["daily_activity"], key=analytics["daily_activity"].get)
            
            logger.info("User analytics retrieved", user_id=user_id, events=len(events))
            return analytics
            
        except Exception as e:
            logger.error("User analytics retrieval failed", error=str(e))
            return {"error": str(e)}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_platform_metrics(self, days: int = 7) -> Dict[str, Any]:
        """Get platform-wide metrics"""
        try:
            if not self.bigquery_enabled:
                return {"error": "BigQuery not available for platform metrics"}
            
            # BigQuery queries for platform metrics
            query = f"""
            SELECT 
                COUNT(DISTINCT user_id) as active_users,
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as total_sessions,
                AVG(ARRAY_LENGTH(SPLIT(event_data, ','))) as avg_session_length
            FROM `{self.project_id}.{self.dataset_id}.user_events`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
            """
            
            query_job = self.bq_client.query(query)
            results = list(query_job)
            
            if results:
                row = results[0]
                metrics = {
                    "period_days": days,
                    "active_users": row.active_users or 0,
                    "total_events": row.total_events or 0,
                    "total_sessions": row.total_sessions or 0,
                    "avg_session_length": row.avg_session_length or 0
                }
            else:
                metrics = {
                    "period_days": days,
                    "active_users": 0,
                    "total_events": 0,
                    "total_sessions": 0,
                    "avg_session_length": 0
                }
            
            logger.info("Platform metrics retrieved", days=days)
            return metrics
            
        except Exception as e:
            logger.error("Platform metrics retrieval failed", error=str(e))
            return {"error": str(e)}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_feature_usage(self, feature_name: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """Get feature usage analytics"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Base query
            query = (
                self.db.collection("user_events")
                .where("timestamp", ">=", start_date)
                .where("timestamp", "<=", end_date)
            )
            
            # Filter by feature if specified
            if feature_name:
                query = query.where("event_type", "==", feature_name)
            
            docs = await asyncio.to_thread(query.get)
            events = [doc.to_dict() for doc in docs]
            
            # Calculate feature usage
            usage = {
                "feature_name": feature_name or "all_features",
                "period_days": days,
                "total_usage": len(events),
                "unique_users": len(set(e["user_id"] for e in events)),
                "daily_usage": {},
                "top_users": {}
            }
            
            # Daily usage
            for event in events:
                day = event["timestamp"].date().isoformat()
                usage["daily_usage"][day] = usage["daily_usage"].get(day, 0) + 1
            
            # Top users
            user_counts = {}
            for event in events:
                user_id = event["user_id"]
                user_counts[user_id] = user_counts.get(user_id, 0) + 1
            
            # Sort and get top 10
            sorted_users = sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            usage["top_users"] = dict(sorted_users)
            
            logger.info("Feature usage retrieved", feature=feature_name, events=len(events))
            return usage
            
        except Exception as e:
            logger.error("Feature usage retrieval failed", error=str(e))
            return {"error": str(e)}

    async def _send_to_bigquery(self, table_name: str, data: Dict[str, Any]):
        """Send data to BigQuery table"""
        try:
            table_ref = self.bq_client.dataset(self.dataset_id).table(table_name)
            
            # Convert datetime objects to strings for BigQuery
            processed_data = {}
            for key, value in data.items():
                if isinstance(value, datetime):
                    processed_data[key] = value.isoformat()
                else:
                    processed_data[key] = value
            
            # Insert row
            errors = self.bq_client.insert_rows_json(table_ref, [processed_data])
            
            if errors:
                logger.error("BigQuery insert failed", errors=errors)
            else:
                logger.debug("Data sent to BigQuery", table=table_name)
                
        except Exception as e:
            logger.error("BigQuery send failed", error=str(e))

    async def generate_user_insights(self, user_id: str) -> Dict[str, Any]:
        """Generate AI-powered user insights"""
        try:
            # Get user analytics
            analytics = await self.get_user_analytics(user_id, days=30)
            
            if "error" in analytics:
                return analytics
            
            # Generate insights based on analytics
            insights = {
                "user_id": user_id,
                "activity_level": "low",
                "engagement_score": 0,
                "recommendations": [],
                "trends": {}
            }
            
            # Determine activity level
            total_events = analytics.get("total_events", 0)
            if total_events > 100:
                insights["activity_level"] = "high"
                insights["engagement_score"] = 85
            elif total_events > 50:
                insights["activity_level"] = "medium"
                insights["engagement_score"] = 60
            else:
                insights["activity_level"] = "low"
                insights["engagement_score"] = 30
            
            # Generate recommendations
            if insights["activity_level"] == "low":
                insights["recommendations"].append("Consider exploring more features to improve your job search")
                insights["recommendations"].append("Try completing your profile for better job matches")
            
            # Analyze trends
            daily_activity = analytics.get("daily_activity", {})
            if len(daily_activity) > 1:
                values = list(daily_activity.values())
                if len(values) >= 2:
                    recent_avg = sum(values[-3:]) / min(3, len(values))
                    older_avg = sum(values[:-3]) / max(1, len(values) - 3)
                    
                    if recent_avg > older_avg * 1.2:
                        insights["trends"]["activity"] = "increasing"
                    elif recent_avg < older_avg * 0.8:
                        insights["trends"]["activity"] = "decreasing"
                    else:
                        insights["trends"]["activity"] = "stable"
            
            logger.info("User insights generated", user_id=user_id)
            return insights
            
        except Exception as e:
            logger.error("User insights generation failed", error=str(e))
            return {"error": str(e)}