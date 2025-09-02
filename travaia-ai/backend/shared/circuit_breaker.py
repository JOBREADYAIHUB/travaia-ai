"""
Circuit Breaker Pattern Implementation for TRAVAIA Backend Services
Prevents cascade failures and provides graceful degradation
"""

import asyncio
import time
from enum import Enum
from typing import Callable, Any, Optional, Dict
from dataclasses import dataclass
import logging
from functools import wraps

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, requests fail fast
    HALF_OPEN = "half_open"  # Testing if service is back

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5          # Failures before opening circuit
    recovery_timeout: int = 60          # Seconds before trying half-open
    success_threshold: int = 3          # Successes needed to close circuit
    timeout: float = 30.0               # Request timeout in seconds
    expected_exception: tuple = (Exception,)  # Exceptions that count as failures

class CircuitBreakerStats:
    def __init__(self):
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.last_success_time = None
        self.total_requests = 0
        self.total_failures = 0

class CircuitBreaker:
    def __init__(self, name: str, config: CircuitBreakerConfig = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.stats = CircuitBreakerStats()
        self.last_failure_time = None
        self._lock = asyncio.Lock()

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        async with self._lock:
            self.stats.total_requests += 1
            
            # Check if circuit should be opened
            if self._should_open_circuit():
                self.state = CircuitState.OPEN
                self.last_failure_time = time.time()
                logger.warning(f"Circuit breaker {self.name} opened due to failures")

            # Check if circuit should transition to half-open
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker {self.name} attempting reset (half-open)")

        # Handle different circuit states
        if self.state == CircuitState.OPEN:
            raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is open")

        try:
            # Execute the function with timeout
            result = await asyncio.wait_for(
                self._execute_async(func, *args, **kwargs),
                timeout=self.config.timeout
            )
            await self._on_success()
            return result

        except self.config.expected_exception as e:
            await self._on_failure()
            raise e
        except asyncio.TimeoutError:
            await self._on_failure()
            raise CircuitBreakerTimeoutError(f"Circuit breaker {self.name} timeout")

    async def _execute_async(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function, handling both sync and async functions"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, func, *args, **kwargs)

    async def _on_success(self):
        """Handle successful function execution"""
        async with self._lock:
            self.stats.success_count += 1
            self.stats.last_success_time = time.time()
            
            if self.state == CircuitState.HALF_OPEN:
                if self.stats.success_count >= self.config.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.stats.failure_count = 0
                    logger.info(f"Circuit breaker {self.name} closed after successful recovery")

    async def _on_failure(self):
        """Handle failed function execution"""
        async with self._lock:
            self.stats.failure_count += 1
            self.stats.total_failures += 1
            self.stats.last_failure_time = time.time()
            self.last_failure_time = time.time()
            
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit breaker {self.name} reopened after failure during recovery")

    def _should_open_circuit(self) -> bool:
        """Check if circuit should be opened"""
        return (self.state == CircuitState.CLOSED and 
                self.stats.failure_count >= self.config.failure_threshold)

    def _should_attempt_reset(self) -> bool:
        """Check if circuit should attempt reset to half-open"""
        return (self.state == CircuitState.OPEN and
                self.last_failure_time and
                time.time() - self.last_failure_time >= self.config.recovery_timeout)

    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.stats.failure_count,
            "success_count": self.stats.success_count,
            "total_requests": self.stats.total_requests,
            "total_failures": self.stats.total_failures,
            "last_failure_time": self.stats.last_failure_time,
            "last_success_time": self.stats.last_success_time,
            "failure_rate": self.stats.total_failures / max(self.stats.total_requests, 1)
        }

class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass

class CircuitBreakerTimeoutError(Exception):
    """Raised when circuit breaker times out"""
    pass

# Global circuit breaker registry
_circuit_breakers: Dict[str, CircuitBreaker] = {}

def get_circuit_breaker(name: str, config: CircuitBreakerConfig = None) -> CircuitBreaker:
    """Get or create a circuit breaker instance"""
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(name, config)
    return _circuit_breakers[name]

def circuit_breaker(name: str, config: CircuitBreakerConfig = None):
    """Decorator for circuit breaker protection"""
    def decorator(func: Callable):
        cb = get_circuit_breaker(name, config)
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await cb.call(func, *args, **kwargs)
        return wrapper
    return decorator

# Pre-configured circuit breakers for common services
FIREBASE_CIRCUIT_BREAKER = CircuitBreakerConfig(
    failure_threshold=3,
    recovery_timeout=30,
    timeout=10.0,
    expected_exception=(Exception,)
)

EXTERNAL_API_CIRCUIT_BREAKER = CircuitBreakerConfig(
    failure_threshold=5,
    recovery_timeout=60,
    timeout=30.0,
    expected_exception=(Exception,)
)

PUBSUB_CIRCUIT_BREAKER = CircuitBreakerConfig(
    failure_threshold=3,
    recovery_timeout=45,
    timeout=15.0,
    expected_exception=(Exception,)
)
