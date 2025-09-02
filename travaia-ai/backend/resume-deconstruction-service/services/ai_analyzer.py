"""
AI Analyzer Service
Gemini AI-powered resume content analysis
"""

import os
import asyncio
from typing import Dict, Any, List, Optional
import logging
import google.generativeai as genai
from google.cloud import aiplatform

from api.routes.analysis import AnalysisResult

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """AI-powered resume analysis using Gemini AI"""
    
    def __init__(self):
        # Initialize Gemini AI
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            logger.warning("Gemini API key not found, using mock responses")
            self.model = None
    
    async def comprehensive_analysis(self, resume_data: Dict[str, Any]) -> AnalysisResult:
        """Perform comprehensive AI analysis of resume"""
        try:
            # Extract resume content for analysis
            content = self._extract_resume_content(resume_data)
            
            if self.model:
                # Use Gemini AI for analysis
                analysis_prompt = self._build_comprehensive_prompt(content)
                response = await self._generate_ai_response(analysis_prompt)
                parsed_analysis = self._parse_ai_response(response, "comprehensive")
            else:
                # Mock analysis for development
                parsed_analysis = self._mock_comprehensive_analysis(content)
            
            return AnalysisResult(
                resumeId=resume_data.get("resumeId", ""),
                analysisType="comprehensive",
                **parsed_analysis
            )
            
        except Exception as e:
            logger.error(f"Comprehensive analysis failed: {str(e)}")
            return self._fallback_analysis(resume_data, "comprehensive")
    
    async def quick_analysis(self, resume_data: Dict[str, Any], focus_areas: List[str]) -> AnalysisResult:
        """Perform quick AI analysis focusing on specific areas"""
        try:
            content = self._extract_resume_content(resume_data)
            
            if self.model:
                analysis_prompt = self._build_quick_prompt(content, focus_areas)
                response = await self._generate_ai_response(analysis_prompt)
                parsed_analysis = self._parse_ai_response(response, "quick")
            else:
                parsed_analysis = self._mock_quick_analysis(content, focus_areas)
            
            return AnalysisResult(
                resumeId=resume_data.get("resumeId", ""),
                analysisType="quick",
                **parsed_analysis
            )
            
        except Exception as e:
            logger.error(f"Quick analysis failed: {str(e)}")
            return self._fallback_analysis(resume_data, "quick")
    
    async def targeted_analysis(self, resume_data: Dict[str, Any], focus_areas: List[str]) -> AnalysisResult:
        """Perform targeted analysis on specific resume sections"""
        try:
            content = self._extract_resume_content(resume_data)
            
            if self.model:
                analysis_prompt = self._build_targeted_prompt(content, focus_areas)
                response = await self._generate_ai_response(analysis_prompt)
                parsed_analysis = self._parse_ai_response(response, "targeted")
            else:
                parsed_analysis = self._mock_targeted_analysis(content, focus_areas)
            
            return AnalysisResult(
                resumeId=resume_data.get("resumeId", ""),
                analysisType="targeted",
                **parsed_analysis
            )
            
        except Exception as e:
            logger.error(f"Targeted analysis failed: {str(e)}")
            return self._fallback_analysis(resume_data, "targeted")
    
    def _extract_resume_content(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure resume content for AI analysis"""
        parsed_data = resume_data.get("parsedData", {})
        
        return {
            "personal_info": parsed_data.get("personalInfo", {}),
            "summary": parsed_data.get("summary", ""),
            "experience": parsed_data.get("experience", []),
            "education": parsed_data.get("education", []),
            "skills": parsed_data.get("skills", []),
            "certifications": parsed_data.get("certifications", []),
            "raw_text": parsed_data.get("rawText", "")
        }
    
    def _build_comprehensive_prompt(self, content: Dict[str, Any]) -> str:
        """Build comprehensive analysis prompt for Gemini AI"""
        return f"""
        Analyze this resume comprehensively and provide detailed feedback:

        PERSONAL INFO: {content.get('personal_info', {})}
        SUMMARY: {content.get('summary', 'None provided')}
        EXPERIENCE: {content.get('experience', [])}
        EDUCATION: {content.get('education', [])}
        SKILLS: {content.get('skills', [])}
        CERTIFICATIONS: {content.get('certifications', [])}

        Please provide analysis in the following format:
        1. Overall Score (0-100)
        2. Top 3 Strengths with specific examples
        3. Top 3 Weaknesses with improvement suggestions
        4. 5 Specific Recommendations for improvement
        5. Skills Analysis (relevance, gaps, strengths)
        6. Experience Analysis (progression, impact, clarity)
        7. Education Analysis (relevance, presentation)
        8. Content Quality Assessment (clarity, impact, keywords)
        9. ATS Compatibility Score and suggestions
        10. Market Alignment assessment

        Focus on actionable, specific feedback that will help improve the resume's effectiveness.
        """
    
    def _build_quick_prompt(self, content: Dict[str, Any], focus_areas: List[str]) -> str:
        """Build quick analysis prompt focusing on specific areas"""
        focus_text = ", ".join(focus_areas) if focus_areas else "general assessment"
        
        return f"""
        Perform a quick analysis of this resume focusing on: {focus_text}

        RESUME CONTENT:
        Personal Info: {content.get('personal_info', {})}
        Summary: {content.get('summary', 'None')}
        Experience: {len(content.get('experience', []))} positions
        Education: {len(content.get('education', []))} entries
        Skills: {len(content.get('skills', []))} skills listed

        Provide:
        1. Quick overall score (0-100)
        2. 2-3 key strengths
        3. 2-3 main areas for improvement
        4. 3-5 quick recommendations
        
        Keep analysis concise but actionable.
        """
    
    def _build_targeted_prompt(self, content: Dict[str, Any], focus_areas: List[str]) -> str:
        """Build targeted analysis prompt for specific sections"""
        return f"""
        Analyze these specific areas of the resume: {', '.join(focus_areas)}

        RESUME SECTIONS:
        {self._format_targeted_content(content, focus_areas)}

        For each focus area, provide:
        1. Current effectiveness score (0-100)
        2. Specific strengths
        3. Specific weaknesses
        4. Detailed improvement recommendations
        5. Industry best practices comparison

        Be specific and actionable in your feedback.
        """
    
    def _format_targeted_content(self, content: Dict[str, Any], focus_areas: List[str]) -> str:
        """Format content based on focus areas"""
        formatted = []
        
        for area in focus_areas:
            if area.lower() == "summary" and content.get("summary"):
                formatted.append(f"SUMMARY: {content['summary']}")
            elif area.lower() == "experience":
                formatted.append(f"EXPERIENCE: {content.get('experience', [])}")
            elif area.lower() == "skills":
                formatted.append(f"SKILLS: {content.get('skills', [])}")
            elif area.lower() == "education":
                formatted.append(f"EDUCATION: {content.get('education', [])}")
        
        return "\n\n".join(formatted)
    
    async def _generate_ai_response(self, prompt: str) -> str:
        """Generate AI response using Gemini"""
        try:
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"AI response generation failed: {str(e)}")
            raise
    
    def _parse_ai_response(self, response: str, analysis_type: str) -> Dict[str, Any]:
        """Parse AI response into structured analysis result"""
        # This is a simplified parser - in production, you'd want more robust parsing
        try:
            lines = response.split('\n')
            
            # Extract overall score
            overall_score = 75.0  # Default fallback
            for line in lines:
                if 'score' in line.lower() and any(char.isdigit() for char in line):
                    import re
                    numbers = re.findall(r'\d+', line)
                    if numbers:
                        overall_score = float(numbers[0]) / 100.0
                        break
            
            # Extract strengths, weaknesses, recommendations
            strengths = self._extract_list_items(response, ["strength", "strong"])
            weaknesses = self._extract_list_items(response, ["weakness", "weak", "improve"])
            recommendations = self._extract_list_items(response, ["recommend", "suggest"])
            
            return {
                "overallScore": overall_score,
                "strengths": strengths[:3],
                "weaknesses": weaknesses[:3],
                "recommendations": recommendations[:5],
                "skillsAnalysis": {"score": overall_score, "details": "AI analysis completed"},
                "experienceAnalysis": {"score": overall_score, "details": "AI analysis completed"},
                "educationAnalysis": {"score": overall_score, "details": "AI analysis completed"},
                "contentQuality": {"score": overall_score, "readability": overall_score},
                "atsCompatibility": {"score": overall_score, "suggestions": []},
                "marketAlignment": {"score": overall_score, "trends": []}
            }
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            return self._default_analysis_structure()
    
    def _extract_list_items(self, text: str, keywords: List[str]) -> List[Dict[str, Any]]:
        """Extract list items from AI response based on keywords"""
        items = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in keywords):
                if line and len(line) > 10:  # Meaningful content
                    items.append({
                        "title": line[:50] + "..." if len(line) > 50 else line,
                        "description": line,
                        "priority": "medium"
                    })
        
        return items[:5]  # Limit to 5 items
    
    def _mock_comprehensive_analysis(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Mock comprehensive analysis for development"""
        return {
            "overallScore": 0.78,
            "strengths": [
                {"title": "Strong technical skills", "description": "Comprehensive skill set relevant to target roles", "priority": "high"},
                {"title": "Clear experience progression", "description": "Shows career growth and increasing responsibilities", "priority": "high"},
                {"title": "Quantified achievements", "description": "Uses numbers and metrics to demonstrate impact", "priority": "medium"}
            ],
            "weaknesses": [
                {"title": "Missing professional summary", "description": "No compelling summary to grab attention", "priority": "high"},
                {"title": "Inconsistent formatting", "description": "Formatting varies across sections", "priority": "medium"},
                {"title": "Limited keywords", "description": "Missing industry-specific keywords for ATS", "priority": "medium"}
            ],
            "recommendations": [
                {"title": "Add professional summary", "description": "Create a 3-4 line summary highlighting key qualifications", "priority": "high"},
                {"title": "Standardize formatting", "description": "Use consistent bullet points, fonts, and spacing", "priority": "medium"},
                {"title": "Include more keywords", "description": "Research job descriptions and include relevant keywords", "priority": "high"},
                {"title": "Quantify more achievements", "description": "Add numbers, percentages, and metrics where possible", "priority": "medium"},
                {"title": "Optimize for ATS", "description": "Use standard section headers and avoid complex formatting", "priority": "high"}
            ],
            "skillsAnalysis": {"score": 0.82, "details": "Strong technical skills, could add more soft skills"},
            "experienceAnalysis": {"score": 0.75, "details": "Good progression, needs more quantified results"},
            "educationAnalysis": {"score": 0.70, "details": "Relevant education, could highlight relevant coursework"},
            "contentQuality": {"score": 0.73, "readability": 0.80},
            "atsCompatibility": {"score": 0.65, "suggestions": ["Use standard headers", "Add more keywords"]},
            "marketAlignment": {"score": 0.77, "trends": ["High demand for listed skills"]}
        }
    
    def _mock_quick_analysis(self, content: Dict[str, Any], focus_areas: List[str]) -> Dict[str, Any]:
        """Mock quick analysis for development"""
        return {
            "overallScore": 0.72,
            "strengths": [
                {"title": "Relevant experience", "description": "Experience aligns with target roles", "priority": "high"},
                {"title": "Technical proficiency", "description": "Strong technical skill set", "priority": "medium"}
            ],
            "weaknesses": [
                {"title": "Weak summary", "description": "Professional summary needs improvement", "priority": "high"},
                {"title": "Limited metrics", "description": "More quantified achievements needed", "priority": "medium"}
            ],
            "recommendations": [
                {"title": "Strengthen summary", "description": "Create compelling professional summary", "priority": "high"},
                {"title": "Add metrics", "description": "Include numbers and percentages", "priority": "medium"},
                {"title": "Optimize keywords", "description": "Include industry-specific terms", "priority": "medium"}
            ],
            "skillsAnalysis": {"score": 0.75, "details": "Quick skills assessment completed"},
            "experienceAnalysis": {"score": 0.70, "details": "Quick experience review completed"},
            "educationAnalysis": {"score": 0.68, "details": "Quick education assessment completed"},
            "contentQuality": {"score": 0.72, "readability": 0.75},
            "atsCompatibility": {"score": 0.68, "suggestions": ["Standard formatting needed"]},
            "marketAlignment": {"score": 0.74, "trends": ["Skills in demand"]}
        }
    
    def _mock_targeted_analysis(self, content: Dict[str, Any], focus_areas: List[str]) -> Dict[str, Any]:
        """Mock targeted analysis for development"""
        return {
            "overallScore": 0.76,
            "strengths": [
                {"title": f"Strong {focus_areas[0] if focus_areas else 'content'}", "description": f"Targeted analysis shows strength in {focus_areas[0] if focus_areas else 'general areas'}", "priority": "high"}
            ],
            "weaknesses": [
                {"title": f"Improve {focus_areas[-1] if focus_areas else 'formatting'}", "description": f"Targeted improvements needed in {focus_areas[-1] if focus_areas else 'various areas'}", "priority": "medium"}
            ],
            "recommendations": [
                {"title": "Targeted improvements", "description": f"Focus on enhancing {', '.join(focus_areas) if focus_areas else 'key areas'}", "priority": "high"}
            ],
            "skillsAnalysis": {"score": 0.78, "details": "Targeted skills analysis completed"},
            "experienceAnalysis": {"score": 0.74, "details": "Targeted experience analysis completed"},
            "educationAnalysis": {"score": 0.72, "details": "Targeted education analysis completed"},
            "contentQuality": {"score": 0.76, "readability": 0.78},
            "atsCompatibility": {"score": 0.70, "suggestions": ["Targeted ATS improvements"]},
            "marketAlignment": {"score": 0.75, "trends": ["Targeted market analysis"]}
        }
    
    def _fallback_analysis(self, resume_data: Dict[str, Any], analysis_type: str) -> AnalysisResult:
        """Fallback analysis when AI fails"""
        return AnalysisResult(
            resumeId=resume_data.get("resumeId", ""),
            analysisType=analysis_type,
            **self._default_analysis_structure()
        )
    
    def _default_analysis_structure(self) -> Dict[str, Any]:
        """Default analysis structure for fallback"""
        return {
            "overallScore": 0.60,
            "strengths": [{"title": "Resume processed", "description": "Basic analysis completed", "priority": "low"}],
            "weaknesses": [{"title": "Analysis limited", "description": "Full AI analysis unavailable", "priority": "low"}],
            "recommendations": [{"title": "Manual review", "description": "Consider manual resume review", "priority": "medium"}],
            "skillsAnalysis": {"score": 0.60, "details": "Basic analysis only"},
            "experienceAnalysis": {"score": 0.60, "details": "Basic analysis only"},
            "educationAnalysis": {"score": 0.60, "details": "Basic analysis only"},
            "contentQuality": {"score": 0.60, "readability": 0.60},
            "atsCompatibility": {"score": 0.60, "suggestions": []},
            "marketAlignment": {"score": 0.60, "trends": []}
        }
