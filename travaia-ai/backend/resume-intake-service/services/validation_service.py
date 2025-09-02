"""
Validation Service
Handles resume data validation and quality checks
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ValidationError(BaseModel):
    field: str
    code: str
    message: str
    severity: str  # error, warning, info

class ValidationSuggestion(BaseModel):
    field: str
    suggestion: str
    priority: str  # high, medium, low

class ValidationResult(BaseModel):
    isValid: bool
    score: float
    errors: List[ValidationError]
    warnings: List[ValidationError]
    suggestions: List[ValidationSuggestion]
    completeness: Dict[str, Any]

class ValidationService:
    """Service for validating resume data quality and completeness"""
    
    def __init__(self):
        self.required_fields = {
            'personalInfo': ['name', 'email'],
            'experience': [],
            'education': [],
            'skills': []
        }
        
        self.recommended_fields = {
            'personalInfo': ['phone', 'location'],
            'summary': True,
            'experience': ['title', 'company', 'dates'],
            'education': ['degree', 'institution'],
            'skills': ['name']
        }
    
    async def validate_basic(self, resume_data: Dict[str, Any]) -> ValidationResult:
        """Perform basic validation checks"""
        errors = []
        warnings = []
        suggestions = []
        
        # Check required fields
        personal_info = resume_data.get('personalInfo', {})
        
        # Name validation
        if not personal_info.get('name'):
            errors.append(ValidationError(
                field='personalInfo.name',
                code='MISSING_NAME',
                message='Name is required',
                severity='error'
            ))
        elif len(personal_info['name'].strip()) < 2:
            errors.append(ValidationError(
                field='personalInfo.name',
                code='INVALID_NAME',
                message='Name must be at least 2 characters long',
                severity='error'
            ))
        
        # Email validation
        if not personal_info.get('email'):
            errors.append(ValidationError(
                field='personalInfo.email',
                code='MISSING_EMAIL',
                message='Email is required',
                severity='error'
            ))
        elif not self._is_valid_email(personal_info['email']):
            errors.append(ValidationError(
                field='personalInfo.email',
                code='INVALID_EMAIL',
                message='Email format is invalid',
                severity='error'
            ))
        
        # Phone validation (warning if missing)
        if not personal_info.get('phone'):
            warnings.append(ValidationError(
                field='personalInfo.phone',
                code='MISSING_PHONE',
                message='Phone number is recommended',
                severity='warning'
            ))
        elif personal_info.get('phone') and not self._is_valid_phone(personal_info['phone']):
            warnings.append(ValidationError(
                field='personalInfo.phone',
                code='INVALID_PHONE',
                message='Phone number format may be invalid',
                severity='warning'
            ))
        
        # Calculate completeness
        completeness = self._calculate_completeness(resume_data)
        
        # Generate suggestions
        suggestions.extend(self._generate_basic_suggestions(resume_data))
        
        # Calculate score
        score = self._calculate_basic_score(errors, warnings, completeness)
        
        return ValidationResult(
            isValid=len(errors) == 0,
            score=score,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions,
            completeness=completeness
        )
    
    async def validate_structure(self, resume_data: Dict[str, Any]) -> ValidationResult:
        """Validate resume structure and organization"""
        errors = []
        warnings = []
        suggestions = []
        
        # Check main sections exist
        main_sections = ['personalInfo', 'experience', 'education', 'skills']
        for section in main_sections:
            if section not in resume_data:
                errors.append(ValidationError(
                    field=section,
                    code='MISSING_SECTION',
                    message=f'{section} section is missing',
                    severity='error'
                ))
        
        # Validate experience structure
        experience = resume_data.get('experience', [])
        if not isinstance(experience, list):
            errors.append(ValidationError(
                field='experience',
                code='INVALID_STRUCTURE',
                message='Experience must be a list',
                severity='error'
            ))
        else:
            for i, exp in enumerate(experience):
                if not isinstance(exp, dict):
                    errors.append(ValidationError(
                        field=f'experience[{i}]',
                        code='INVALID_EXPERIENCE_ITEM',
                        message='Experience item must be an object',
                        severity='error'
                    ))
                else:
                    # Check required experience fields
                    if not exp.get('title'):
                        warnings.append(ValidationError(
                            field=f'experience[{i}].title',
                            code='MISSING_JOB_TITLE',
                            message='Job title is recommended',
                            severity='warning'
                        ))
                    if not exp.get('company'):
                        warnings.append(ValidationError(
                            field=f'experience[{i}].company',
                            code='MISSING_COMPANY',
                            message='Company name is recommended',
                            severity='warning'
                        ))
        
        # Validate education structure
        education = resume_data.get('education', [])
        if not isinstance(education, list):
            errors.append(ValidationError(
                field='education',
                code='INVALID_STRUCTURE',
                message='Education must be a list',
                severity='error'
            ))
        else:
            for i, edu in enumerate(education):
                if not isinstance(edu, dict):
                    errors.append(ValidationError(
                        field=f'education[{i}]',
                        code='INVALID_EDUCATION_ITEM',
                        message='Education item must be an object',
                        severity='error'
                    ))
                else:
                    if not edu.get('degree') and not edu.get('institution'):
                        warnings.append(ValidationError(
                            field=f'education[{i}]',
                            code='INCOMPLETE_EDUCATION',
                            message='Education should include degree or institution',
                            severity='warning'
                        ))
        
        # Validate skills structure
        skills = resume_data.get('skills', [])
        if not isinstance(skills, list):
            errors.append(ValidationError(
                field='skills',
                code='INVALID_STRUCTURE',
                message='Skills must be a list',
                severity='error'
            ))
        
        completeness = self._calculate_completeness(resume_data)
        suggestions.extend(self._generate_structure_suggestions(resume_data))
        score = self._calculate_structure_score(errors, warnings, completeness)
        
        return ValidationResult(
            isValid=len(errors) == 0,
            score=score,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions,
            completeness=completeness
        )
    
    async def validate_full(self, resume_data: Dict[str, Any]) -> ValidationResult:
        """Perform comprehensive validation"""
        # Combine basic and structure validation
        basic_result = await self.validate_basic(resume_data)
        structure_result = await self.validate_structure(resume_data)
        
        # Additional content validation
        content_errors = []
        content_warnings = []
        content_suggestions = []
        
        # Validate content quality
        personal_info = resume_data.get('personalInfo', {})
        
        # Check for professional summary
        summary = resume_data.get('summary')
        if not summary:
            content_warnings.append(ValidationError(
                field='summary',
                code='MISSING_SUMMARY',
                message='Professional summary is highly recommended',
                severity='warning'
            ))
        elif len(summary.strip()) < 50:
            content_warnings.append(ValidationError(
                field='summary',
                code='SHORT_SUMMARY',
                message='Summary should be at least 50 characters',
                severity='warning'
            ))
        
        # Check experience descriptions
        experience = resume_data.get('experience', [])
        for i, exp in enumerate(experience):
            if isinstance(exp, dict):
                description = exp.get('description', '')
                if not description:
                    content_warnings.append(ValidationError(
                        field=f'experience[{i}].description',
                        code='MISSING_DESCRIPTION',
                        message='Job description is recommended',
                        severity='warning'
                    ))
                elif len(description.strip()) < 20:
                    content_warnings.append(ValidationError(
                        field=f'experience[{i}].description',
                        code='SHORT_DESCRIPTION',
                        message='Job description should be more detailed',
                        severity='warning'
                    ))
        
        # Check skills quantity
        skills = resume_data.get('skills', [])
        if len(skills) < 3:
            content_suggestions.append(ValidationSuggestion(
                field='skills',
                suggestion='Consider adding more skills (aim for 5-10 relevant skills)',
                priority='medium'
            ))
        elif len(skills) > 20:
            content_suggestions.append(ValidationSuggestion(
                field='skills',
                suggestion='Consider reducing skills to most relevant ones (10-15 max)',
                priority='low'
            ))
        
        # Combine all results
        all_errors = basic_result.errors + structure_result.errors + content_errors
        all_warnings = basic_result.warnings + structure_result.warnings + content_warnings
        all_suggestions = basic_result.suggestions + structure_result.suggestions + content_suggestions
        
        completeness = self._calculate_completeness(resume_data)
        score = self._calculate_full_score(all_errors, all_warnings, completeness)
        
        return ValidationResult(
            isValid=len(all_errors) == 0,
            score=score,
            errors=all_errors,
            warnings=all_warnings,
            suggestions=all_suggestions,
            completeness=completeness
        )
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, email))
    
    def _is_valid_phone(self, phone: str) -> bool:
        """Validate phone number format"""
        # Remove common formatting characters
        clean_phone = re.sub(r'[\s\-\(\)\+\.]', '', phone)
        # Check if it's mostly digits and reasonable length
        return clean_phone.isdigit() and 7 <= len(clean_phone) <= 15
    
    def _calculate_completeness(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate completeness scores for different sections"""
        completeness = {}
        
        # Personal info completeness
        personal_info = resume_data.get('personalInfo', {})
        personal_fields = ['name', 'email', 'phone', 'location']
        personal_complete = sum(1 for field in personal_fields if personal_info.get(field))
        completeness['personalInfo'] = {
            'score': personal_complete / len(personal_fields),
            'completed': personal_complete,
            'total': len(personal_fields)
        }
        
        # Experience completeness
        experience = resume_data.get('experience', [])
        if experience:
            exp_fields = ['title', 'company', 'dates', 'description']
            total_exp_fields = len(experience) * len(exp_fields)
            completed_exp_fields = 0
            for exp in experience:
                if isinstance(exp, dict):
                    completed_exp_fields += sum(1 for field in exp_fields if exp.get(field))
            
            completeness['experience'] = {
                'score': completed_exp_fields / total_exp_fields if total_exp_fields > 0 else 0,
                'completed': completed_exp_fields,
                'total': total_exp_fields
            }
        else:
            completeness['experience'] = {'score': 0, 'completed': 0, 'total': 0}
        
        # Education completeness
        education = resume_data.get('education', [])
        if education:
            edu_fields = ['degree', 'institution', 'dates']
            total_edu_fields = len(education) * len(edu_fields)
            completed_edu_fields = 0
            for edu in education:
                if isinstance(edu, dict):
                    completed_edu_fields += sum(1 for field in edu_fields if edu.get(field))
            
            completeness['education'] = {
                'score': completed_edu_fields / total_edu_fields if total_edu_fields > 0 else 0,
                'completed': completed_edu_fields,
                'total': total_edu_fields
            }
        else:
            completeness['education'] = {'score': 0, 'completed': 0, 'total': 0}
        
        # Skills completeness
        skills = resume_data.get('skills', [])
        completeness['skills'] = {
            'score': 1.0 if len(skills) >= 5 else len(skills) / 5,
            'completed': len(skills),
            'total': 5  # Recommended minimum
        }
        
        # Overall completeness
        section_scores = [comp['score'] for comp in completeness.values()]
        completeness['overall'] = {
            'score': sum(section_scores) / len(section_scores) if section_scores else 0
        }
        
        return completeness
    
    def _generate_basic_suggestions(self, resume_data: Dict[str, Any]) -> List[ValidationSuggestion]:
        """Generate basic improvement suggestions"""
        suggestions = []
        
        personal_info = resume_data.get('personalInfo', {})
        
        if not personal_info.get('location'):
            suggestions.append(ValidationSuggestion(
                field='personalInfo.location',
                suggestion='Add your location (city, state) to help with local job searches',
                priority='medium'
            ))
        
        if not resume_data.get('summary'):
            suggestions.append(ValidationSuggestion(
                field='summary',
                suggestion='Add a professional summary to highlight your key qualifications',
                priority='high'
            ))
        
        return suggestions
    
    def _generate_structure_suggestions(self, resume_data: Dict[str, Any]) -> List[ValidationSuggestion]:
        """Generate structure improvement suggestions"""
        suggestions = []
        
        experience = resume_data.get('experience', [])
        if not experience:
            suggestions.append(ValidationSuggestion(
                field='experience',
                suggestion='Add work experience to strengthen your resume',
                priority='high'
            ))
        
        education = resume_data.get('education', [])
        if not education:
            suggestions.append(ValidationSuggestion(
                field='education',
                suggestion='Add education information if applicable',
                priority='medium'
            ))
        
        return suggestions
    
    def _calculate_basic_score(
        self, 
        errors: List[ValidationError], 
        warnings: List[ValidationError], 
        completeness: Dict[str, Any]
    ) -> float:
        """Calculate basic validation score"""
        base_score = 1.0
        
        # Deduct for errors
        base_score -= len(errors) * 0.2
        
        # Deduct for warnings
        base_score -= len(warnings) * 0.1
        
        # Factor in completeness
        overall_completeness = completeness.get('overall', {}).get('score', 0)
        base_score = (base_score * 0.7) + (overall_completeness * 0.3)
        
        return max(0.0, min(1.0, base_score))
    
    def _calculate_structure_score(
        self, 
        errors: List[ValidationError], 
        warnings: List[ValidationError], 
        completeness: Dict[str, Any]
    ) -> float:
        """Calculate structure validation score"""
        base_score = 1.0
        
        # Deduct for errors
        base_score -= len(errors) * 0.25
        
        # Deduct for warnings
        base_score -= len(warnings) * 0.1
        
        # Factor in completeness
        overall_completeness = completeness.get('overall', {}).get('score', 0)
        base_score = (base_score * 0.6) + (overall_completeness * 0.4)
        
        return max(0.0, min(1.0, base_score))
    
    def _calculate_full_score(
        self, 
        errors: List[ValidationError], 
        warnings: List[ValidationError], 
        completeness: Dict[str, Any]
    ) -> float:
        """Calculate comprehensive validation score"""
        base_score = 1.0
        
        # Deduct for errors
        base_score -= len(errors) * 0.15
        
        # Deduct for warnings
        base_score -= len(warnings) * 0.05
        
        # Factor in completeness heavily
        overall_completeness = completeness.get('overall', {}).get('score', 0)
        base_score = (base_score * 0.5) + (overall_completeness * 0.5)
        
        return max(0.0, min(1.0, base_score))
