"""
Initializes the models package for the Application-Job Service.

This file makes the 'models' directory a Python package and exposes the core domain
and Data Transfer Object (DTO) models for easy importing throughout the service.

By centralizing model imports here, we can maintain a clean and organized structure.
"""

# Import and expose domain models
from .domain import (
    Company,
    Contact,
    FavoriteJob,
    Interview,
    InterviewAttempt,
    InterviewConfiguration,
    InterviewQuestionSet,
    JobApplication,
    Note,
    SalaryRange,
)

# Import and expose Data Transfer Objects (DTOs)
from .dto import (
    ApiResponse,
    ApplicationCreateRequest,
    ApplicationUpdateRequest,
    ContactAddRequest,
    FavoriteJobCreateRequest,
    InterviewAttemptCreateRequest,
    InterviewAttemptUpdateRequest,
    InterviewCreateRequest,
    InterviewQuestionSetCreateRequest,
    InterviewQuestionSetUpdateRequest,
    InterviewUpdateRequest,
    NoteAddRequest,
    PaginatedApplicationsResponse,
    PaginationMeta,
    PaginationParams,
)

# Define what is exposed when 'from .models import *' is used
__all__ = [
    # Domain Models
    "Company",
    "Contact",
    "FavoriteJob",
    "Interview",
    "InterviewAttempt",
    "InterviewConfiguration",
    "InterviewQuestionSet",
    "JobApplication",
    "Note",
    "SalaryRange",

    # DTOs
    "ApiResponse",
    "ApplicationCreateRequest",
    "ApplicationUpdateRequest",
    "ContactAddRequest",
    "FavoriteJobCreateRequest",
    "InterviewAttemptCreateRequest",
    "InterviewAttemptUpdateRequest",
    "InterviewCreateRequest",
    "InterviewQuestionSetCreateRequest",
    "InterviewQuestionSetUpdateRequest",
    "InterviewUpdateRequest",
    "NoteAddRequest",
    "PaginatedApplicationsResponse",
    "PaginationMeta",
    "PaginationParams",
]
