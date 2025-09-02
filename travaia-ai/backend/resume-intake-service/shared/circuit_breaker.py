"""
Circuit Breaker Pattern Implementation
Provides resilience for external service calls
"""

import asyncio
import time
from typing import Callable, Any, Dict, Optional
from functools import wraps
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """Circuit breaker implementation for service resilience"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED
        
    def __call__(self, func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    logger.info(f"Circuit breaker for {func.__name__} moved to HALF_OPEN")
                else:
                    raise Exception(f"Circuit breaker is OPEN for {func.__name__}")
            
            try:
                result = await func(*args, **kwargs)
                self._on_success()
                return result
            except self.expected_exception as e:
                self._on_failure()
                raise e
        
        return wrapper
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.recovery_timeout
    
    def _on_success(self):
        """Handle successful operation"""
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        logger.debug("Circuit breaker reset to CLOSED state")
    
    def _on_failure(self):
        """Handle failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")

# Global circuit breakers for different services
_circuit_breakers: Dict[str, CircuitBreaker] = {}

def circuit_breaker(
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    expected_exception: type = Exception
):
    """Decorator for applying circuit breaker pattern"""
    def decorator(func: Callable) -> Callable:
        circuit_name = f"{func.__module__}.{func.__name__}"
        
        if circuit_name not in _circuit_breakers:
            _circuit_breakers[circuit_name] = CircuitBreaker(
                failure_threshold=failure_threshold,
                recovery_timeout=recovery_timeout,
                expected_exception=expected_exception
            )
        
        return _circuit_breakers[circuit_name](func)
    
    return decorator

def get_circuit_breaker_status() -> Dict[str, Dict[str, Any]]:
    """Get status of all circuit breakers"""
    status = {}
    for name, breaker in _circuit_breakers.items():
        status[name] = {
            "state": breaker.state.value,
            "failure_count": breaker.failure_count,
            "failure_threshold": breaker.failure_threshold,
            "last_failure_time": breaker.last_failure_time,
            "recovery_timeout": breaker.recovery_timeout
        }
    return status
