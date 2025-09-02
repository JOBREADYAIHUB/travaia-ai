"""
This module defines the core domain models for the Application-Job Service.

These models represent the fundamental business entities and their structures as they are
stored in the database. They are designed to be clean, reusable, and independent of
any specific API request or response format.
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class SalaryRange(BaseModel):
    """Represents a salary range for a job application."""
    min: Optional[int] = None
    max: Optional[int] = None
    currency: str


class Company(BaseModel):
    """Represents a company associated with a job application."""
    name: str
    website: Optional[str] = None


class Contact(BaseModel):
    """Contact information for a job application."""
    contact_id: Optional[str] = None
    name: str
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None


class Note(BaseModel):
    """A note associated with a job application."""
    note_id: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None


class JobApplication(BaseModel):
    """Core model representing a job application."""
    id: Optional[str] = None
    userId: str
    organizationId: Optional[str] = None
    jobTitle: str
    companyName: Optional[str] = None
    status: Literal['draft', 'applied', 'interviewing', 'offer', 'rejected', 'accepted', 'withdrawn']
    appliedDate: Optional[datetime] = None
    lastUpdate: Optional[datetime] = None
    location: Optional[str] = None
    remotePolicy: Optional[Literal['onsite', 'hybrid', 'remote']] = None
    jobType: Optional[Literal['full-time', 'part-time', 'contract', 'internship']] = None
    salaryRange: Optional[SalaryRange] = None
    recruiterName: Optional[str] = None
    recruiterEmail: Optional[str] = None
    hiringManager: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    aiSummary: Optional[str] = None
    aiNextStepSuggestion: Optional[str] = None
    priorityScore: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime
    company: Optional[Company] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

    @field_validator('status')
    def status_to_lowercase(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v

    @model_validator(mode='before')
    def prepare_data(cls, data):
        if isinstance(data, dict):
            if '_id' in data and 'id' not in data:
                data['id'] = str(data['_id'])
            if 'company' in data and 'name' in data['company'] and 'companyName' not in data:
                data['companyName'] = data['company']['name']
            if 'updatedAt' in data and 'lastUpdate' not in data:
                data['lastUpdate'] = data['updatedAt']
        return data


class FavoriteJob(BaseModel):
    """A job that has been marked as a favorite by the user."""
    favorite_job_id: str
    user_id: str
    job_title: str
    company_name: str
    link: str
    saved_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class InterviewConfiguration(BaseModel):
    """Configuration for an interview session."""
    difficulty: str
    language: str
    question_set_id: str


class Interview(BaseModel):
    """An interview session associated with a job application."""
    interview_id: str
    user_id: str
    application_id: str
    interview_type: str
    configuration: InterviewConfiguration
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class InterviewAttempt(BaseModel):
    """An attempt at an interview session."""
    attempt_id: str
    user_id: str
    interview_id: str
    status: str
    score: int = Field(default=0, ge=0, le=100)
    start_time: datetime
    end_time: Optional[datetime] = None
    recording_url: Optional[str] = None
    feedback_report_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }


class InterviewQuestionSet(BaseModel):
    """A set of questions for an interview."""
    question_set_id: str
    user_id: str
    name: str
    language: str
    questions: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
