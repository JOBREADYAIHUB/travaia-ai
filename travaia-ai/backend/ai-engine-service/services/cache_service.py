"""
Cache Service - Enterprise caching for AI analysis results
"""

import asyncio
import time
import hashlib
import json
from typing import Dict, Any, Optional
import structlog

logger = structlog.get_logger(__name__)

class CacheService:
    """
    Enterprise-grade caching service for AI analysis results
    Improves performance and reduces redundant AI model calls
    """
    
    def __init__(self, default_ttl: int = 3600):
        """
        Initialize cache service
        
        Args:
            default_ttl: Default time-to-live in seconds (1 hour default)
        """
        self.cache = {}
        self.default_ttl = default_ttl
        self.hits = 0
        self.misses = 0
        logger.info("Cache service initialized", default_ttl=default_ttl)
        
    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get item from cache if available and not expired
        
        Args:
            key: Cache key
            
        Returns:
            Cached item or None if not found/expired
        """
        if key in self.cache:
            cache_item = self.cache[key]
            current_time = time.time()
            
            # Check if item has expired
            if current_time <= cache_item["expiry"]:
                self.hits += 1
                logger.debug("Cache hit", key=key, hit_rate=f"{self.hit_rate():.2f}")
                return cache_item["data"]
            else:
                # Remove expired item
                del self.cache[key]
                
        self.misses += 1
        logger.debug("Cache miss", key=key, hit_rate=f"{self.hit_rate():.2f}")
        return None
    
    async def set(self, key: str, data: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """
        Store item in cache
        
        Args:
            key: Cache key
            data: Data to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        expiry_time = time.time() + (ttl if ttl is not None else self.default_ttl)
        self.cache[key] = {
            "data": data,
            "expiry": expiry_time
        }
        logger.debug("Item cached", key=key, ttl=ttl if ttl is not None else self.default_ttl)
        
    def hit_rate(self) -> float:
        """Calculate and return cache hit rate"""
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total * 100.0
    
    def generate_key(self, prefix: str, data: Dict[str, Any]) -> str:
        """
        Generate a consistent cache key from input data
        
        Args:
            prefix: Key prefix for type of analysis
            data: Input data to hash
            
        Returns:
            Stable cache key
        """
        # Create a stable string representation of the input data
        # Sort keys for consistent ordering
        serialized = json.dumps(data, sort_keys=True)
        
        # Create hash from serialized data
        hashed = hashlib.sha256(serialized.encode()).hexdigest()
        
        # Combine prefix with hash
        return f"{prefix}:{hashed}"
    
    async def cleanup(self) -> int:
        """
        Remove all expired items from cache
        
        Returns:
            Number of items removed
        """
        current_time = time.time()
        keys_to_remove = []
        
        # Find expired keys
        for key, item in self.cache.items():
            if current_time > item["expiry"]:
                keys_to_remove.append(key)
                
        # Remove expired keys
        for key in keys_to_remove:
            del self.cache[key]
            
        if keys_to_remove:
            logger.info("Cache cleanup completed", removed_count=len(keys_to_remove))
            
        return len(keys_to_remove)
    
    async def periodic_cleanup(self, interval: int = 300) -> None:
        """
        Periodically clean up expired cache items
        
        Args:
            interval: Cleanup interval in seconds (default 5 minutes)
        """
        while True:
            await asyncio.sleep(interval)
            try:
                removed_count = await self.cleanup()
                logger.debug("Periodic cache cleanup", 
                           removed_count=removed_count,
                           cache_size=len(self.cache),
                           hit_rate=f"{self.hit_rate():.2f}")
            except Exception as e:
                logger.error("Cache cleanup error", error=str(e))
                
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics
        
        Returns:
            Dictionary with cache statistics
        """
        return {
            "size": len(self.cache),
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": self.hit_rate(),
        }
    
    def invalidate(self, key_prefix: str = None) -> int:
        """
        Invalidate cache items by prefix or entirely
        
        Args:
            key_prefix: Optional prefix to target specific items
            
        Returns:
            Number of items invalidated
        """
        if key_prefix is None:
            # Invalidate entire cache
            count = len(self.cache)
            self.cache = {}
            logger.info("Cache fully invalidated", count=count)
            return count
        
        # Invalidate by prefix
        keys_to_remove = [k for k in self.cache if k.startswith(key_prefix)]
        for key in keys_to_remove:
            del self.cache[key]
            
        logger.info("Cache partially invalidated", prefix=key_prefix, count=len(keys_to_remove))
        return len(keys_to_remove)
