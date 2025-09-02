"""
PDF Service - PDF generation and management
Handles PDF creation from templates and data
"""

import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from jinja2 import Template
import io

logger = structlog.get_logger(__name__)

class PDFService:
    """Enterprise PDF generation service"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.custom_styles = self._create_custom_styles()
        logger.info("PDF service initialized")

    def _create_custom_styles(self):
        """Create custom PDF styles"""
        return {
            'title': ParagraphStyle(
                'CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                textColor=colors.HexColor('#2563eb')
            ),
            'subtitle': ParagraphStyle(
                'CustomSubtitle',
                parent=self.styles['Heading2'],
                fontSize=16,
                spaceAfter=20,
                textColor=colors.HexColor('#4b5563')
            ),
            'body': ParagraphStyle(
                'CustomBody',
                parent=self.styles['Normal'],
                fontSize=12,
                spaceAfter=12,
                leading=16
            )
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def generate_interview_report_pdf(self, report_data: Dict[str, Any]) -> bytes:
        """Generate interview feedback report PDF"""
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch)
            
            story = []
            
            # Title
            title = Paragraph("Interview Feedback Report", self.custom_styles['title'])
            story.append(title)
            story.append(Spacer(1, 20))
            
            # Basic info
            info_data = [
                ['Candidate:', report_data.get('candidate_name', 'N/A')],
                ['Position:', report_data.get('position', 'N/A')],
                ['Date:', report_data.get('interview_date', datetime.now().strftime('%Y-%m-%d'))],
                ['Duration:', f"{report_data.get('duration_minutes', 0)} minutes"]
            ]
            
            info_table = Table(info_data, colWidths=[2*inch, 4*inch])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(info_table)
            story.append(Spacer(1, 30))
            
            # Overall Score
            if 'overall_score' in report_data:
                score_title = Paragraph("Overall Performance", self.custom_styles['subtitle'])
                story.append(score_title)
                
                score_text = f"Score: {report_data['overall_score']}/10"
                score_para = Paragraph(score_text, self.custom_styles['body'])
                story.append(score_para)
                story.append(Spacer(1, 20))
            
            # Feedback sections
            if 'feedback' in report_data:
                feedback_title = Paragraph("Detailed Feedback", self.custom_styles['subtitle'])
                story.append(feedback_title)
                
                feedback_text = report_data['feedback']
                feedback_para = Paragraph(feedback_text, self.custom_styles['body'])
                story.append(feedback_para)
                story.append(Spacer(1, 20))
            
            # Recommendations
            if 'recommendations' in report_data:
                rec_title = Paragraph("Recommendations", self.custom_styles['subtitle'])
                story.append(rec_title)
                
                for rec in report_data['recommendations']:
                    rec_para = Paragraph(f"• {rec}", self.custom_styles['body'])
                    story.append(rec_para)
                
                story.append(Spacer(1, 20))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info("Interview report PDF generated", size=len(pdf_bytes))
            return pdf_bytes
            
        except Exception as e:
            logger.error("PDF generation failed", error=str(e))
            raise Exception(f"Failed to generate PDF: {str(e)}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def generate_job_analysis_pdf(self, analysis_data: Dict[str, Any]) -> bytes:
        """Generate job fit analysis report PDF"""
        try:
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch)
            
            story = []
            
            # Title
            title = Paragraph("Job Fit Analysis Report", self.custom_styles['title'])
            story.append(title)
            story.append(Spacer(1, 20))
            
            # Job info
            job_data = [
                ['Position:', analysis_data.get('job_title', 'N/A')],
                ['Company:', analysis_data.get('company_name', 'N/A')],
                ['Analysis Date:', datetime.now().strftime('%Y-%m-%d')],
                ['Match Score:', f"{analysis_data.get('match_score', 0)}%"]
            ]
            
            job_table = Table(job_data, colWidths=[2*inch, 4*inch])
            job_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(job_table)
            story.append(Spacer(1, 30))
            
            # Analysis sections
            if 'analysis' in analysis_data:
                analysis_title = Paragraph("Detailed Analysis", self.custom_styles['subtitle'])
                story.append(analysis_title)
                
                analysis_text = analysis_data['analysis']
                analysis_para = Paragraph(analysis_text, self.custom_styles['body'])
                story.append(analysis_para)
                story.append(Spacer(1, 20))
            
            # Skills match
            if 'skills_match' in analysis_data:
                skills_title = Paragraph("Skills Assessment", self.custom_styles['subtitle'])
                story.append(skills_title)
                
                for skill, match in analysis_data['skills_match'].items():
                    skill_text = f"• {skill}: {match}% match"
                    skill_para = Paragraph(skill_text, self.custom_styles['body'])
                    story.append(skill_para)
                
                story.append(Spacer(1, 20))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info("Job analysis PDF generated", size=len(pdf_bytes))
            return pdf_bytes
            
        except Exception as e:
            logger.error("PDF generation failed", error=str(e))
            raise Exception(f"Failed to generate PDF: {str(e)}")

    async def generate_custom_pdf(self, template_data: Dict[str, Any]) -> bytes:
        """Generate custom PDF from template data"""
        try:
            # This would use Jinja2 templates for more complex PDFs
            # For now, return a simple PDF
            return await self.generate_interview_report_pdf(template_data)
        except Exception as e:
            logger.error("Custom PDF generation failed", error=str(e))
            raise Exception(f"Failed to generate custom PDF: {str(e)}")