"""
Enhanced error response models for consistent API error handling
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from enum import Enum

class ErrorCode(str, Enum):
    """Standardized error codes for the application"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

class ErrorDetail(BaseModel):
    """Detailed error information"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None

class StandardErrorResponse(BaseModel):
    """Standardized error response format"""
    success: bool = False
    error_code: ErrorCode
    message: str
    details: Optional[list[ErrorDetail]] = None
    request_id: Optional[str] = None
    timestamp: Optional[str] = None
    
    class Config:
        json_encoders = {
            ErrorCode: lambda v: v.value
        }
