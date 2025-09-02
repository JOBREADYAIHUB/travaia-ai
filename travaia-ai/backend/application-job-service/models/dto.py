"""
This module defines the Data Transfer Objects (DTOs) for the Application-Job Service.

DTOs are used to structure the data for API requests and responses. They provide a clear
contract for the API and help to decouple the external interface from the internal
-domain models.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union, TypeVar, Generic

from pydantic import BaseModel, Field

from .domain import JobApplication


T = TypeVar('T')


# --- Pagination DTOs ---

class PaginationParams(BaseModel):
    """Defines query parameters for pagination in API requests."""
    page: int = Field(default=1, ge=1, description="Page number, starting from 1.")
    limit: int = Field(default=10, ge=1, le=100, description="Number of items per page.")


class PaginationMeta(BaseModel):
    """Contains metadata for paginated API responses."""
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


# --- General API Response DTOs ---

class ApiResponse(BaseModel, Generic[T]):
    """A standard wrapper for all API responses."""
    success: bool
    message: str
    data: Optional[T] = None
    error: Optional[str] = None
    pagination: Optional[PaginationMeta] = None


class PaginatedApplicationsResponse(BaseModel):
    """A specialized response for returning a paginated list of job applications."""
    applications: List[JobApplication]
    pagination: PaginationMeta


# --- Job Application DTOs ---

class ApplicationCreateRequest(BaseModel):
    """DTO for creating a new job application."""
    job_title: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(..., min_length=1, max_length=100)
    status: Literal['draft', 'applied', 'interviewing', 'offer', 'rejected', 'accepted', 'withdrawn'] = 'draft'
    appliedDate: Optional[datetime] = None
    location: Optional[str] = None


class ApplicationUpdateRequest(BaseModel):
    """DTO for updating an existing job application. All fields are optional."""
    job_title: Optional[str] = Field(None, min_length=1, max_length=200)
    company_name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[Literal['draft', 'applied', 'Interviewing', 'Interviewed', 'InterviewScheduled', 'offer', 'rejected', 'accepted', 'withdrawn']] = None
    appliedDate: Optional[datetime] = None
    location: Optional[str] = None


# --- Contact DTOs ---

class ContactAddRequest(BaseModel):
    """DTO for adding a new contact to a job application."""
    name: str = Field(..., min_length=1, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)


# --- Note DTOs ---

class NoteAddRequest(BaseModel):
    """DTO for adding a new note to a job application."""
    content: str = Field(..., min_length=1, max_length=1000)


# --- Favorite Job DTOs ---

class FavoriteJobCreateRequest(BaseModel):
    """DTO for creating a new favorite job."""
    job_title: str = Field(..., min_length=1, max_length=200)
    company_name: str = Field(..., min_length=1, max_length=100)
    link: str = Field(..., min_length=1, max_length=1000)


# --- Interview DTOs ---

class InterviewCreateRequest(BaseModel):
    """DTO for creating a new interview session."""
    application_id: str
    interview_type: Literal['mock', 'practice', 'real']
    difficulty: str
    language: str
    question_set_id: str


class InterviewUpdateRequest(BaseModel):
    """DTO for updating an interview session. All fields are optional."""
    interview_type: Optional[Literal['mock', 'practice', 'real']] = None
    difficulty: Optional[str] = None
    language: Optional[str] = None
    status: Optional[Literal['scheduled', 'in_progress', 'completed', 'cancelled']] = None


class InterviewAttemptCreateRequest(BaseModel):
    """DTO for creating a new interview attempt."""
    pass


class InterviewAttemptUpdateRequest(BaseModel):
    """DTO for updating an interview attempt."""
    status: Optional[Literal['in_progress', 'completed', 'cancelled']] = None
    score: Optional[int] = Field(None, ge=0, le=100)


class InterviewQuestionSetCreateRequest(BaseModel):
    """DTO for creating a new set of interview questions."""
    name: str = Field(..., min_length=1, max_length=200)
    language: str = Field(..., min_length=2, max_length=5)
    questions: List[str] = Field(..., min_length=1, max_length=100)


class InterviewQuestionSetUpdateRequest(BaseModel):
    """DTO for updating an existing set of interview questions."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    language: Optional[str] = Field(None, min_length=2, max_length=5)
    questions: Optional[List[str]] = Field(None, min_length=1, max_length=100)
