"""
Cache Management Routes - Enterprise cache monitoring and management
"""

"""
Cache Management Routes - Enterprise cache monitoring and management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict
import structlog

from api.dependencies import get_cache_service
from services.cache_service import CacheService
from models.dto import CacheInvalidateRequest
from models.domain import CacheStatisticsResponse, CacheInvalidateResponse

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.get("/stats", response_model=CacheStatisticsResponse)
async def get_cache_statistics(cache_service: CacheService = Depends(get_cache_service)):
    """Get cache statistics and performance metrics"""
    try:
        stats = cache_service.get_stats()
        
        # Count entries by cache type
        cache_types = {}
        for key in cache_service.cache:
            prefix = key.split(":")[0] if ":" in key else "unknown"
            if prefix in cache_types:
                cache_types[prefix] += 1
            else:
                cache_types[prefix] = 1
        
        return CacheStatisticsResponse(
            size=stats["size"],
            hits=stats["hits"],
            misses=stats["misses"],
            hit_rate=stats["hit_rate"],
            cache_types=cache_types
        )
    except Exception as e:
        logger.error("Failed to get cache statistics", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get cache statistics: {str(e)}")

@router.post("/invalidate", response_model=CacheInvalidateResponse)
async def invalidate_cache(
    request: CacheInvalidateRequest,
    cache_service: CacheService = Depends(get_cache_service)
):
    """Invalidate cache entries by prefix or entirely"""
    try:
        if request.prefix:
            invalidated_count = cache_service.invalidate(request.prefix)
            message = f"Invalidated {invalidated_count} cache entries with prefix '{request.prefix}'"
        else:
            invalidated_count = cache_service.invalidate()
            message = f"Invalidated all {invalidated_count} cache entries"
            
        logger.info("Cache invalidated", 
                   prefix=request.prefix if request.prefix else "all", 
                   count=invalidated_count)
        
        return CacheInvalidateResponse(
            invalidated_count=invalidated_count,
            message=message
        )
    except Exception as e:
        logger.error("Failed to invalidate cache", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to invalidate cache: {str(e)}")

@router.get("/keys", response_model=List[str])
async def list_cache_keys(
    prefix: str = Query(None, description="Filter keys by prefix"),
    cache_service: CacheService = Depends(get_cache_service)
):
    """List all cache keys, optionally filtered by prefix"""
    try:
        keys = list(cache_service.cache.keys())
        
        if prefix:
            keys = [key for key in keys if key.startswith(prefix)]
            
        return keys
    except Exception as e:
        logger.error("Failed to list cache keys", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to list cache keys: {str(e)}")

@router.get("/cleanup")
async def manual_cleanup(cache_service: CacheService = Depends(get_cache_service)):
    """Manually trigger cache cleanup to remove expired items"""
    try:
        removed_count = await cache_service.cleanup()
        return {"removed_count": removed_count, "message": f"Removed {removed_count} expired cache items"}
    except Exception as e:
        logger.error("Failed to clean up cache", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to clean up cache: {str(e)}")
