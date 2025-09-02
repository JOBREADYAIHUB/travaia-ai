"""
Simplified circuit breaker for interview-session-service
"""

from functools import wraps
from typing import Any, Callable

# Mock circuit breaker constants
FIREBASE_CIRCUIT_BREAKER = "firebase"
EXTERNAL_API_CIRCUIT_BREAKER = "external_api"

def circuit_breaker(breaker_name: str):
    """
    Simplified circuit breaker decorator
    In production, this should implement actual circuit breaker logic
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator
