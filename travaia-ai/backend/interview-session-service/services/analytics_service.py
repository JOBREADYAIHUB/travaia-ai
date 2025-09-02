"""
Analytics Service - Interview analytics and performance insights
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import structlog
from google.cloud import firestore, bigquery, pubsub_v1
import json
import statistics

logger = structlog.get_logger(__name__)

class AnalyticsService:
    def __init__(self):
        self.db = firestore.AsyncClient()
        self.bq_client = bigquery.Client()
        self.publisher = pubsub_v1.PublisherClient()
        self.project_id = "travaia-e1310"  # Configure as needed
        self.dataset_id = "interview_analytics"
        
    async def get_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive analytics dashboard data"""
        try:
            # Get user's interview sessions
            sessions_query = (self.db.collection("interviews")
                            .where("user_id", "==", user_id)
                            .order_by("created_at", direction=firestore.Query.DESCENDING)
                            .limit(50))
            
            sessions = []
            async for doc in sessions_query.stream():
                session_data = doc.to_dict()
                sessions.append(session_data)
            
            if not sessions:
                return self._empty_dashboard()
            
            # Calculate key metrics
            total_sessions = len(sessions)
            completed_sessions = len([s for s in sessions if s.get("status") == "completed"])
            
            # Performance trends
            recent_sessions = [s for s in sessions if self._is_recent(s.get("created_at"), days=30)]
            
            # Average scores
            scores = [s.get("overall_score", 0) for s in sessions if s.get("overall_score")]
            avg_score = statistics.mean(scores) if scores else 0
            
            # Skills analysis
            skills_data = await self._analyze_skills_performance(sessions)
            
            # Time analysis
            time_analysis = await self._analyze_time_patterns(sessions)
            
            dashboard = {
                "overview": {
                    "total_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "completion_rate": completed_sessions / total_sessions if total_sessions > 0 else 0,
                    "average_score": round(avg_score, 2),
                    "recent_sessions_count": len(recent_sessions),
                    "improvement_trend": self._calculate_improvement_trend(sessions)
                },
                "performance_metrics": {
                    "communication_score": round(statistics.mean([s.get("communication_score", 0) for s in sessions if s.get("communication_score")]) or 0, 2),
                    "technical_score": round(statistics.mean([s.get("technical_score", 0) for s in sessions if s.get("technical_score")]) or 0, 2),
                    "confidence_score": round(statistics.mean([s.get("confidence_score", 0) for s in sessions if s.get("confidence_score")]) or 0, 2),
                    "clarity_score": round(statistics.mean([s.get("clarity_score", 0) for s in sessions if s.get("clarity_score")]) or 0, 2)
                },
                "skills_analysis": skills_data,
                "time_analysis": time_analysis,
                "recent_activity": recent_sessions[:10],
                "recommendations": await self._generate_recommendations(user_id, sessions)
            }
            
            return dashboard
            
        except Exception as e:
            logger.error("Dashboard data retrieval failed", error=str(e))
            raise e
    
    async def query_analytics(self, user_id: str, date_range: Dict[str, str], 
                            session_types: List[str], interview_types: List[str], 
                            metrics: List[str]) -> Dict[str, Any]:
        """Query analytics with custom filters"""
        try:
            # Build query
            query = self.db.collection("interviews").where("user_id", "==", user_id)
            
            # Apply date range filter
            if date_range.get("start"):
                start_date = datetime.fromisoformat(date_range["start"])
                query = query.where("created_at", ">=", start_date)
            
            if date_range.get("end"):
                end_date = datetime.fromisoformat(date_range["end"])
                query = query.where("created_at", "<=", end_date)
            
            # Get filtered sessions
            sessions = []
            async for doc in query.stream():
                session_data = doc.to_dict()
                
                # Apply additional filters
                if session_types and session_data.get("session_type") not in session_types:
                    continue
                if interview_types and session_data.get("interview_type") not in interview_types:
                    continue
                
                sessions.append(session_data)
            
            # Calculate requested metrics
            results = {}
            
            if not metrics or "performance" in metrics:
                results["performance"] = await self._calculate_performance_metrics(sessions)
            
            if not metrics or "trends" in metrics:
                results["trends"] = await self._calculate_trends(sessions)
            
            if not metrics or "skills" in metrics:
                results["skills"] = await self._analyze_skills_performance(sessions)
            
            if not metrics or "time_patterns" in metrics:
                results["time_patterns"] = await self._analyze_time_patterns(sessions)
            
            results["session_count"] = len(sessions)
            results["date_range"] = date_range
            
            return results
            
        except Exception as e:
            logger.error("Analytics query failed", error=str(e))
            raise e
    
    async def get_session_analytics(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed analytics for specific session"""
        try:
            doc = await self.db.collection("interviews").document(session_id).get()
            
            if not doc.exists:
                return None
            
            session = doc.to_dict()
            
            # Verify user ownership
            if session.get("user_id") != user_id:
                return None
            
            # Get session attempts
            attempts_query = self.db.collection("interviews").document(session_id).collection("attempts")
            attempts = []
            async for attempt_doc in attempts_query.stream():
                attempts.append(attempt_doc.to_dict())
            
            # Detailed analysis
            analytics = {
                "session_info": {
                    "id": session_id,
                    "type": session.get("interview_type"),
                    "status": session.get("status"),
                    "created_at": session.get("created_at"),
                    "duration": session.get("duration_minutes"),
                    "attempts_count": len(attempts)
                },
                "performance_scores": {
                    "overall": session.get("overall_score", 0),
                    "communication": session.get("communication_score", 0),
                    "technical": session.get("technical_score", 0),
                    "confidence": session.get("confidence_score", 0),
                    "clarity": session.get("clarity_score", 0)
                },
                "detailed_analysis": {
                    "strengths": session.get("strengths", []),
                    "areas_for_improvement": session.get("areas_for_improvement", []),
                    "key_insights": session.get("key_insights", []),
                    "recommendations": session.get("recommendations", [])
                },
                "question_analysis": await self._analyze_question_performance(attempts),
                "speech_analysis": session.get("speech_analysis", {}),
                "behavioral_insights": session.get("behavioral_insights", {})
            }
            
            return analytics
            
        except Exception as e:
            logger.error("Session analytics retrieval failed", error=str(e))
            raise e
    
    async def analyze_performance(self, user_id: str, session_ids: List[str], analysis_type: str) -> Dict[str, Any]:
        """Analyze interview performance with AI insights"""
        try:
            # Get sessions
            sessions = []
            for session_id in session_ids or []:
                doc = await self.db.collection("interviews").document(session_id).get()
                if doc.exists and doc.to_dict().get("user_id") == user_id:
                    sessions.append(doc.to_dict())
            
            # If no specific sessions, get recent ones
            if not sessions:
                query = (self.db.collection("interviews")
                        .where("user_id", "==", user_id)
                        .order_by("created_at", direction=firestore.Query.DESCENDING)
                        .limit(10))
                
                async for doc in query.stream():
                    sessions.append(doc.to_dict())
            
            if not sessions:
                return {"error": "No sessions found for analysis"}
            
            # Perform analysis based on type
            if analysis_type == "comprehensive":
                analysis = await self._comprehensive_analysis(sessions)
            elif analysis_type == "quick":
                analysis = await self._quick_analysis(sessions)
            else:  # detailed
                analysis = await self._detailed_analysis(sessions)
            
            # Add AI-generated insights
            analysis["ai_insights"] = await self._generate_ai_insights(sessions)
            analysis["analysis_type"] = analysis_type
            analysis["sessions_analyzed"] = len(sessions)
            analysis["generated_at"] = datetime.utcnow()
            
            return analysis
            
        except Exception as e:
            logger.error("Performance analysis failed", error=str(e))
            raise e
    
    async def get_performance_trends(self, user_id: str, period: str) -> Dict[str, Any]:
        """Get performance trends over time"""
        try:
            # Calculate date range
            days = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}.get(period, 30)
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Get sessions in period
            query = (self.db.collection("interviews")
                    .where("user_id", "==", user_id)
                    .where("created_at", ">=", start_date)
                    .order_by("created_at"))
            
            sessions = []
            async for doc in query.stream():
                sessions.append(doc.to_dict())
            
            # Group by time periods
            trends = {
                "period": period,
                "total_sessions": len(sessions),
                "score_trend": self._calculate_score_trend(sessions),
                "skill_trends": self._calculate_skill_trends(sessions),
                "activity_pattern": self._calculate_activity_pattern(sessions),
                "improvement_areas": self._identify_improvement_areas(sessions),
                "consistency_score": self._calculate_consistency_score(sessions)
            }
            
            return trends
            
        except Exception as e:
            logger.error("Performance trends retrieval failed", error=str(e))
            raise e
    
    async def compare_sessions(self, user_id: str, baseline_session_id: str, comparison_session_ids: List[str]) -> Dict[str, Any]:
        """Compare multiple interview sessions"""
        try:
            # Get baseline session
            baseline_doc = await self.db.collection("interviews").document(baseline_session_id).get()
            if not baseline_doc.exists or baseline_doc.to_dict().get("user_id") != user_id:
                raise ValueError("Baseline session not found")
            
            baseline = baseline_doc.to_dict()
            
            # Get comparison sessions
            comparisons = []
            for session_id in comparison_session_ids:
                doc = await self.db.collection("interviews").document(session_id).get()
                if doc.exists and doc.to_dict().get("user_id") == user_id:
                    comparisons.append(doc.to_dict())
            
            # Perform comparison
            comparison_result = {
                "baseline_session": {
                    "id": baseline_session_id,
                    "date": baseline.get("created_at"),
                    "overall_score": baseline.get("overall_score", 0),
                    "type": baseline.get("interview_type")
                },
                "comparisons": [],
                "improvements": [],
                "regressions": [],
                "recommendations": []
            }
            
            for session in comparisons:
                comparison_data = self._compare_two_sessions(baseline, session)
                comparison_result["comparisons"].append(comparison_data)
                
                # Track improvements and regressions
                if comparison_data["score_change"] > 0:
                    comparison_result["improvements"].append(comparison_data)
                elif comparison_data["score_change"] < 0:
                    comparison_result["regressions"].append(comparison_data)
            
            # Generate recommendations based on comparison
            comparison_result["recommendations"] = self._generate_comparison_recommendations(comparison_result)
            
            return comparison_result
            
        except Exception as e:
            logger.error("Session comparison failed", error=str(e))
            raise e
    
    async def get_ai_insights(self, user_id: str) -> Dict[str, Any]:
        """Get AI-generated insights and recommendations"""
        try:
            # Get recent sessions
            query = (self.db.collection("interviews")
                    .where("user_id", "==", user_id)
                    .order_by("created_at", direction=firestore.Query.DESCENDING)
                    .limit(20))
            
            sessions = []
            async for doc in query.stream():
                sessions.append(doc.to_dict())
            
            if not sessions:
                return {"message": "No sessions available for insights"}
            
            insights = {
                "performance_insights": await self._generate_performance_insights(sessions),
                "skill_recommendations": await self._generate_skill_recommendations(sessions),
                "career_guidance": await self._generate_career_guidance(user_id, sessions),
                "learning_path": await self._generate_learning_path(sessions),
                "next_steps": await self._generate_next_steps(sessions),
                "generated_at": datetime.utcnow()
            }
            
            return insights
            
        except Exception as e:
            logger.error("AI insights retrieval failed", error=str(e))
            raise e
    
    async def get_skills_assessment(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive skills assessment"""
        try:
            # Get all user sessions
            query = self.db.collection("interviews").where("user_id", "==", user_id)
            sessions = []
            async for doc in query.stream():
                sessions.append(doc.to_dict())
            
            if not sessions:
                return {"message": "No sessions available for assessment"}
            
            assessment = {
                "overall_assessment": self._calculate_overall_skills(sessions),
                "technical_skills": self._assess_technical_skills(sessions),
                "soft_skills": self._assess_soft_skills(sessions),
                "communication_skills": self._assess_communication_skills(sessions),
                "leadership_skills": self._assess_leadership_skills(sessions),
                "skill_gaps": self._identify_skill_gaps(sessions),
                "strengths": self._identify_strengths(sessions),
                "development_priorities": self._prioritize_development_areas(sessions),
                "assessment_date": datetime.utcnow()
            }
            
            return assessment
            
        except Exception as e:
            logger.error("Skills assessment retrieval failed", error=str(e))
            raise e
    
    async def get_industry_benchmarks(self, user_id: str, industry: Optional[str] = None) -> Dict[str, Any]:
        """Get industry benchmarks and comparisons"""
        try:
            # Get user's sessions for comparison
            user_query = self.db.collection("interviews").where("user_id", "==", user_id)
            user_sessions = []
            async for doc in user_query.stream():
                user_sessions.append(doc.to_dict())
            
            if not user_sessions:
                return {"message": "No user data available for benchmarking"}
            
            # Calculate user averages
            user_avg_score = statistics.mean([s.get("overall_score", 0) for s in user_sessions if s.get("overall_score")]) or 0
            
            # Get industry benchmarks (placeholder - would integrate with actual benchmark data)
            benchmarks = {
                "user_performance": {
                    "average_score": round(user_avg_score, 2),
                    "sessions_count": len(user_sessions),
                    "top_skills": self._get_top_skills(user_sessions)
                },
                "industry_benchmarks": {
                    "technology": {"average_score": 75, "top_skills": ["problem_solving", "technical_knowledge", "communication"]},
                    "finance": {"average_score": 78, "top_skills": ["analytical_thinking", "attention_to_detail", "communication"]},
                    "healthcare": {"average_score": 80, "top_skills": ["empathy", "attention_to_detail", "communication"]},
                    "marketing": {"average_score": 73, "top_skills": ["creativity", "communication", "analytical_thinking"]}
                },
                "comparison": self._compare_to_industry(user_avg_score, industry),
                "recommendations": self._generate_benchmark_recommendations(user_avg_score, industry)
            }
            
            return benchmarks
            
        except Exception as e:
            logger.error("Industry benchmarks retrieval failed", error=str(e))
            raise e
    
    async def export_analytics(self, user_id: str, format: str) -> Dict[str, Any]:
        """Export analytics data in various formats"""
        try:
            # Get comprehensive analytics data
            dashboard_data = await self.get_dashboard_data(user_id)
            
            # Generate export based on format
            if format == "json":
                export_url = await self._export_json(user_id, dashboard_data)
            elif format == "csv":
                export_url = await self._export_csv(user_id, dashboard_data)
            elif format == "pdf":
                export_url = await self._export_pdf(user_id, dashboard_data)
            else:
                raise ValueError("Unsupported export format")
            
            return {
                "url": export_url,
                "format": format,
                "generated_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(hours=24)
            }
            
        except Exception as e:
            logger.error("Analytics export failed", error=str(e))
            raise e
    
    # Helper methods (placeholder implementations)
    def _empty_dashboard(self) -> Dict[str, Any]:
        """Return empty dashboard structure"""
        return {
            "overview": {"total_sessions": 0, "completed_sessions": 0, "completion_rate": 0, "average_score": 0},
            "performance_metrics": {"communication_score": 0, "technical_score": 0, "confidence_score": 0, "clarity_score": 0},
            "skills_analysis": {},
            "time_analysis": {},
            "recent_activity": [],
            "recommendations": []
        }
    
    def _is_recent(self, date, days: int) -> bool:
        """Check if date is within recent days"""
        if not date:
            return False
        cutoff = datetime.utcnow() - timedelta(days=days)
        return date >= cutoff
    
    def _calculate_improvement_trend(self, sessions: List[Dict[str, Any]]) -> str:
        """Calculate improvement trend"""
        if len(sessions) < 2:
            return "insufficient_data"
        
        recent_scores = [s.get("overall_score", 0) for s in sessions[:5] if s.get("overall_score")]
        older_scores = [s.get("overall_score", 0) for s in sessions[5:10] if s.get("overall_score")]
        
        if not recent_scores or not older_scores:
            return "insufficient_data"
        
        recent_avg = statistics.mean(recent_scores)
        older_avg = statistics.mean(older_scores)
        
        if recent_avg > older_avg + 2:
            return "improving"
        elif recent_avg < older_avg - 2:
            return "declining"
        else:
            return "stable"
    
    async def _analyze_skills_performance(self, sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze skills performance across sessions"""
        # Placeholder implementation
        return {
            "technical_skills": 75,
            "communication_skills": 80,
            "problem_solving": 70,
            "leadership": 65
        }
    
    async def _analyze_time_patterns(self, sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze time patterns in sessions"""
        # Placeholder implementation
        return {
            "average_duration": 25,
            "peak_performance_time": "morning",
            "consistency_score": 0.8
        }
    
    async def _generate_recommendations(self, user_id: str, sessions: List[Dict[str, Any]]) -> List[str]:
        """Generate personalized recommendations"""
        # Placeholder implementation
        return [
            "Practice technical questions more frequently",
            "Work on reducing filler words",
            "Prepare more specific examples for behavioral questions"
        ]
    
    # Additional placeholder methods for comprehensive functionality
    async def _calculate_performance_metrics(self, sessions): return {}
    async def _calculate_trends(self, sessions): return {}
    async def _analyze_question_performance(self, attempts): return {}
    async def _comprehensive_analysis(self, sessions): return {}
    async def _quick_analysis(self, sessions): return {}
    async def _detailed_analysis(self, sessions): return {}
    async def _generate_ai_insights(self, sessions): return {}
    def _calculate_score_trend(self, sessions): return []
    def _calculate_skill_trends(self, sessions): return {}
    def _calculate_activity_pattern(self, sessions): return {}
    def _identify_improvement_areas(self, sessions): return []
    def _calculate_consistency_score(self, sessions): return 0.0
    def _compare_two_sessions(self, baseline, comparison): return {}
    def _generate_comparison_recommendations(self, comparison_result): return []
    async def _generate_performance_insights(self, sessions): return []
    async def _generate_skill_recommendations(self, sessions): return []
    async def _generate_career_guidance(self, user_id, sessions): return []
    async def _generate_learning_path(self, sessions): return []
    async def _generate_next_steps(self, sessions): return []
    def _calculate_overall_skills(self, sessions): return {}
    def _assess_technical_skills(self, sessions): return {}
    def _assess_soft_skills(self, sessions): return {}
    def _assess_communication_skills(self, sessions): return {}
    def _assess_leadership_skills(self, sessions): return {}
    def _identify_skill_gaps(self, sessions): return []
    def _identify_strengths(self, sessions): return []
    def _prioritize_development_areas(self, sessions): return []
    def _get_top_skills(self, sessions): return []
    def _compare_to_industry(self, user_score, industry): return {}
    def _generate_benchmark_recommendations(self, user_score, industry): return []
    async def _export_json(self, user_id, data): return "https://example.com/export.json"
    async def _export_csv(self, user_id, data): return "https://example.com/export.csv"
    async def _export_pdf(self, user_id, data): return "https://example.com/export.pdf"