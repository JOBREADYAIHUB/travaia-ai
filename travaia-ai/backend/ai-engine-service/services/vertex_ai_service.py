"""
Vertex AI Service - Enterprise-grade AI operations
Handles Vertex AI integration for 10M+ daily users with optimal performance
"""

import os
import json
import asyncio
import sys
from typing import List, Dict, Any, Optional, Union
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from google.cloud import aiplatform
from google.cloud.aiplatform.gapic.schema import predict
import vertexai
from vertexai.generative_models import GenerativeModel, Part, FinishReason
import vertexai.preview.generative_models as generative_models

# Add shared directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from firebase_config import cloud_config

logger = structlog.get_logger(__name__)

class VertexAIService:
    """Enterprise Vertex AI service for high-scale operations"""
    
    def __init__(self):
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = os.getenv("VERTEX_AI_LOCATION", "us-central1")
        self.model_name = "gemini-1.5-pro-002"  # Latest production model
        
        try:
            # Initialize Vertex AI with error handling
            if self.project_id:
                vertexai.init(project=self.project_id, location=self.location)
                self.model = GenerativeModel(self.model_name)
                logger.info("Vertex AI initialized successfully", project=self.project_id)
            else:
                logger.warning("GOOGLE_CLOUD_PROJECT not set, Vertex AI disabled")
                self.model = None
        except Exception as e:
            logger.error("Failed to initialize Vertex AI", error=str(e))
            self.model = None
        
        # Generation config for enterprise use
        self.generation_config = {
            "max_output_tokens": 8192,
            "temperature": 0.3,  # Lower for consistency
            "top_p": 0.8,
            "top_k": 40
        }
        
        # Define supported languages with ISO codes and language names
        self.supported_languages = {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "ar": "Arabic",
            "zh": "Chinese",
            "ja": "Japanese",
            "ko": "Korean",
            "ru": "Russian",
            "pt": "Portuguese",
            "it": "Italian",
            "nl": "Dutch",
            "hi": "Hindi",
            "tr": "Turkish",
            "pl": "Polish",
            "vi": "Vietnamese",
            "th": "Thai",
            "id": "Indonesian",
            "sv": "Swedish",
            "no": "Norwegian"
        }
        
        # Safety settings for enterprise
        self.safety_settings = {
            generative_models.HarmCategory.HARM_CATEGORY_HATE_SPEECH: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            generative_models.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            generative_models.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            generative_models.HarmCategory.HARM_CATEGORY_HARASSMENT: generative_models.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
        
        logger.info("VertexAI service initialized", project=self.project_id, location=self.location)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def analyze_job_fit(self, user_profile: Dict[str, Any], job_description: str, language: str = "en") -> Dict[str, Any]:
        """Analyze job fit with enterprise-grade reliability"""
        
        # Determine language name for prompt
        language_name = self.supported_languages.get(language, "English")
        language_code = language if language in self.supported_languages else "en"
        
        # Adapt prompt based on language
        if language_code == "en":
            prompt = f"""
            You are an expert HR analyst. Analyze the job fit for this candidate with precision.

            CANDIDATE PROFILE:
            Skills: {user_profile.get('skills', [])}
            Experience: {user_profile.get('experience', [])}
            Education: {user_profile.get('education', [])}
            Years of Experience: {user_profile.get('years_experience', 0)}

            JOB DESCRIPTION:
            {job_description}

            ANALYSIS REQUIREMENTS:
            1. Calculate precise fit score (0-100) based on:
               - Skills match (40% weight)
               - Experience relevance (35% weight)
               - Education alignment (25% weight)
            
            2. Identify specific missing skills (max 5)
            3. Provide actionable improvement suggestions (max 5)
            4. Highlight top 3 strengths for this role

            Return ONLY valid JSON in this exact format:
            {{
                "fit_score": 85.5,
                "missing_skills": ["Python", "Machine Learning"],
                "suggested_improvements": ["Complete Python certification", "Build ML portfolio"],
                "strengths": ["Strong communication", "Relevant experience", "Good education"],
                "confidence_level": 0.92
            }}
            """
        else:
            # Multilingual prompt with instructions to respond in the target language
            prompt = f"""
            You are an expert HR analyst. Analyze the job fit for this candidate with precision.
            Respond in {language_name}.

            CANDIDATE PROFILE:
            Skills: {user_profile.get('skills', [])}
            Experience: {user_profile.get('experience', [])}
            Education: {user_profile.get('education', [])}
            Years of Experience: {user_profile.get('years_experience', 0)}

            JOB DESCRIPTION:
            {job_description}

            ANALYSIS REQUIREMENTS:
            1. Calculate precise fit score (0-100) based on:
               - Skills match (40% weight)
               - Experience relevance (35% weight)
               - Education alignment (25% weight)
            
            2. Identify specific missing skills (max 5) in {language_name}
            3. Provide actionable improvement suggestions (max 5) in {language_name}
            4. Highlight top 3 strengths for this role in {language_name}

            Return ONLY valid JSON in this exact format with all text fields in {language_name}:
            {{
                "fit_score": 85.5,
                "missing_skills": ["Python", "Machine Learning"],
                "suggested_improvements": ["Complete Python certification", "Build ML portfolio"],
                "strengths": ["Strong communication", "Relevant experience", "Good education"],
                "confidence_level": 0.92,
                "language": "{language_code}"  
            }}
            """
        
        try:
            if not self.model:
                return {
                    "fit_score": 75.0,
                    "missing_skills": ["Service unavailable"],
                    "suggested_improvements": ["AI service temporarily unavailable"],
                    "strengths": ["Profile analysis pending"],
                    "confidence_level": 0.5
                }
            
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            # Parse and validate response
            result = json.loads(response.text.strip())
            
            # Validate required fields
            required_fields = ["fit_score", "missing_skills", "suggested_improvements", "strengths"]
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"Missing required field: {field}")
            
            # Add language to result if not present
            if "language" not in result:
                result["language"] = language
                
            logger.info("Job fit analysis completed", 
                       score=result.get("fit_score"), 
                       language=language)
            return result
            
        except Exception as e:
            logger.error("Job fit analysis failed", error=str(e))
            # Return fallback response
            error_message = "Analysis temporarily unavailable"
            retry_message = "Please try again later"
            
            # Provide localized error messages for common languages
            if language == "es":
                error_message = "Análisis temporalmente no disponible"
                retry_message = "Por favor, inténtelo de nuevo más tarde"
            elif language == "fr":
                error_message = "Analyse temporairement indisponible"
                retry_message = "Veuillez réessayer plus tard"
            elif language == "de":
                error_message = "Analyse vorübergehend nicht verfügbar"
                retry_message = "Bitte versuchen Sie es später noch einmal"
            
            return {
                "fit_score": 50.0,
                "missing_skills": ["Analysis unavailable"],
                "suggested_improvements": [retry_message],
                "strengths": ["Profile review needed"],
                "confidence_level": 0.1,
                "error": error_message,
                "language": language
            }

    def get_difficulty_map(self, language_code: str) -> Dict[str, str]:
        """Get difficulty level descriptions in different languages"""
        
        difficulty_maps = {
            "en": {
                "easy": "entry-level, basic concepts",
                "medium": "mid-level, practical scenarios", 
                "hard": "senior-level, complex problem-solving"
            },
            "es": {
                "easy": "nivel principiante, conceptos básicos",
                "medium": "nivel intermedio, escenarios prácticos", 
                "hard": "nivel senior, resolución de problemas complejos"
            },
            "fr": {
                "easy": "niveau débutant, concepts de base",
                "medium": "niveau intermédiaire, scénarios pratiques", 
                "hard": "niveau senior, résolution de problèmes complexes"
            },
            "de": {
                "easy": "Einstiegsniveau, Grundkonzepte",
                "medium": "mittleres Niveau, praktische Szenarien", 
                "hard": "Senior-Niveau, komplexe Problemlösung"
            },
            "ar": {
                "easy": "مستوى مبتدئ، مفاهيم أساسية",
                "medium": "مستوى متوسط، سيناريوهات عملية", 
                "hard": "مستوى متقدم، حل مشكلات معقدة"
            }
        }
        
        # Default to English if language not supported
        return difficulty_maps.get(language_code, difficulty_maps["en"])
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_interview_questions(
        self, 
        job_description: str, 
        user_profile: Dict[str, Any], 
        difficulty: str = "medium",
        language: str = "en",
        count: int = 10
    ) -> Dict[str, Any]:
        """Generate contextual interview questions"""
        
        # Get difficulty descriptions in the appropriate language
        language_code = language if language in self.supported_languages else "en"
        language_name = self.supported_languages.get(language_code, "English")
        difficulty_map = self.get_difficulty_map(language_code)
        difficulty_description = difficulty_map.get(difficulty, difficulty_map["medium"])
        
        # Define question type ratios based on language
        question_type_ratios = "behavioral (40%), technical (40%), and situational (20%)";
        
        prompt = f"""
        You are an expert interview coach. Generate {count} high-quality interview questions in {language_name}.

        JOB DESCRIPTION:
        {job_description}

        CANDIDATE BACKGROUND:
        Skills: {user_profile.get('skills', [])}
        Experience Level: {user_profile.get('experience_level', 'mid')}
        Industry: {user_profile.get('industry', 'general')}

        REQUIREMENTS:
        - Difficulty: {difficulty_description}
        - Language: {language_name}
        - Mix of {question_type_ratios} questions
        - Tailored to the specific job and candidate background
        - Progressive difficulty within the set

        Return ONLY valid JSON with all questions in {language_name}:
        {{
            "questions": [
                "Tell me about a challenging project you worked on...",
                "How would you approach..."
            ],
            "question_types": ["behavioral", "technical", "situational"],
            "estimated_duration": 45,
            "difficulty_level": "{difficulty}",
            "language": "{language_code}"
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            result = json.loads(response.text.strip())
            
            # Validate questions
            if "questions" not in result or len(result["questions"]) < count:
                raise ValueError("Insufficient questions generated")
            
            logger.info("Interview questions generated", count=len(result["questions"]), difficulty=difficulty)
            return result
            
        except Exception as e:
            logger.error("Question generation failed", error=str(e))
            # Return fallback questions
            return {
                "questions": [
                    "Tell me about yourself and your background.",
                    "Why are you interested in this position?",
                    "What are your greatest strengths?",
                    "Describe a challenging situation you faced at work.",
                    "How do you handle pressure and tight deadlines?",
                    "What motivates you in your career?",
                    "Where do you see yourself in 5 years?",
                    "How do you stay current with industry trends?",
                    "Describe your ideal work environment.",
                    "Do you have any questions for us?"
                ],
                "question_types": ["behavioral", "general"],
                "estimated_duration": 30,
                "difficulty_level": difficulty,
                "error": "Using fallback questions"
            }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def analyze_interview_response(
        self, 
        question: str, 
        response: str, 
        context: Dict[str, Any] = None,
        language: str = "en"
    ) -> Dict[str, Any]:
        """Analyze interview response with detailed feedback"""
        
        # Determine language name for prompt
        language_name = self.supported_languages.get(language, "English")
        language_code = language if language in self.supported_languages else "en"
        
        prompt = f"""
        You are an expert interview coach. Analyze this interview response with detailed feedback.
        Provide your analysis in {language_name}.

        QUESTION: {question}
        RESPONSE: {response}
        CONTEXT: {context or {}}

        ANALYSIS CRITERIA:
        1. Content Quality (0-10): Relevance, depth, examples
        2. Communication (0-10): Clarity, structure, confidence
        3. Technical Accuracy (0-10): If applicable
        4. Behavioral Indicators (0-10): Leadership, teamwork, problem-solving

        Return ONLY valid JSON with all text fields in {language_name}:
        {{
            "overall_score": 7.5,
            "content_score": 8.0,
            "communication_score": 7.0,
            "technical_score": 8.0,
            "behavioral_score": 7.0,
            "strengths": ["Clear examples", "Good structure"],
            "improvements": ["Add more metrics", "Show more confidence"],
            "sentiment": "positive",
            "confidence_indicators": ["strong", "hesitant", "confident"],
            "key_phrases": ["leadership", "problem-solving"],
            "language": "{language_code}"
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            result = json.loads(response.text.strip())
            logger.info("Response analysis completed", score=result.get("overall_score"))
            return result
            
        except Exception as e:
            logger.error("Response analysis failed", error=str(e))
            return {
                "overall_score": 5.0,
                "content_score": 5.0,
                "communication_score": 5.0,
                "technical_score": 5.0,
                "behavioral_score": 5.0,
                "strengths": ["Response received"],
                "improvements": ["Analysis unavailable"],
                "sentiment": "neutral",
                "confidence_indicators": ["unclear"],
                "key_phrases": [],
                "error": "Analysis temporarily unavailable"
            }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_comprehensive_feedback(
        self, 
        interview_data: Dict[str, Any],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Generate comprehensive interview feedback report"""
        
        # Determine language name for prompt
        language_name = self.supported_languages.get(language, "English")
        language_code = language if language in self.supported_languages else "en"
        
        prompt = f"""
        You are an expert career coach. Generate comprehensive interview feedback in {language_name}.

        INTERVIEW DATA:
        Questions: {len(interview_data.get('responses', []))} questions
        Responses: {interview_data.get('responses', [])}
        Duration: {interview_data.get('duration', 0)} minutes
        Job Role: {interview_data.get('job_title', 'Not specified')}

        GENERATE COMPREHENSIVE FEEDBACK:
        1. Overall performance score (0-100)
        2. Category scores: Communication, Technical, Behavioral, Cultural Fit
        3. Top 3 strengths with specific examples
        4. Top 3 improvement areas with actionable advice
        5. Detailed paragraph feedback (100-150 words) in {language_name}
        6. Next steps recommendations in {language_name}

        Return ONLY valid JSON with all text fields in {language_name}:
        {{
            "overall_score": 78.5,
            "category_scores": {{
                "communication": 80,
                "technical": 75,
                "behavioral": 82,
                "cultural_fit": 77
            }},
            "strengths": ["Excellent communication", "Strong examples", "Good technical knowledge"],
            "improvements": ["More confidence", "Quantify achievements", "Ask better questions"],
            "detailed_feedback": "Your interview showed strong technical competency...",
            "next_steps": ["Practice confidence building", "Prepare STAR examples", "Research company culture"],
            "interview_readiness": "strong",
            "recommended_focus_areas": ["confidence", "storytelling", "technical depth"],
            "language": "{language_code}"
        }}
        """
        
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config,
                safety_settings=self.safety_settings
            )
            
            result = json.loads(response.text.strip())
            
            # Add language to result if not present
            if "language" not in result:
                result["language"] = language
                
            logger.info("Comprehensive feedback generated", 
                      score=result.get("overall_score"), 
                      language=language)
            return result
            
        except Exception as e:
            logger.error("Feedback generation failed", error=str(e))
            return {
                "overall_score": 60.0,
                "category_scores": {
                    "communication": 60,
                    "technical": 60,
                    "behavioral": 60,
                    "cultural_fit": 60
                },
                "strengths": ["Completed interview", "Showed engagement", "Professional demeanor"],
                "improvements": ["Continue practicing", "Seek feedback", "Build confidence"],
                "detailed_feedback": "Thank you for completing the interview. While we encountered technical difficulties in generating detailed feedback, your participation shows commitment to improvement.",
                "next_steps": ["Schedule follow-up session", "Practice common questions", "Review job requirements"],
                "interview_readiness": "developing",
                "recommended_focus_areas": ["practice", "preparation", "confidence"],
                "error": "Detailed analysis temporarily unavailable"
            }