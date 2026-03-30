"""
Redis Cache Service for Financial Data

Provides TTL-based caching for:
- Financial module results (radar, dupont, dcf, etc.)
- Stock prices
- Valuation metrics

Usage:
    from cache.redis_cache import get_cache

    cache = get_cache()
    result = cache.get_or_set('financial:radar:600519', lambda: compute_radar(), ttl=3600)
"""

import os
import json
import hashlib
from typing import Any, Callable, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Cache configuration
REDIS_URL = os.getenv('REDIS_URL', '')
CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
DEFAULT_TTL = int(os.getenv('CACHE_DEFAULT_TTL', '3600'))  # 1 hour


class CacheBackend:
    """Abstract cache backend interface"""

    def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        raise NotImplementedError

    def delete(self, key: str) -> bool:
        raise NotImplementedError

    def clear(self) -> bool:
        raise NotImplementedError

    def get_stats(self) -> dict:
        raise NotImplementedError


class MemoryCache(CacheBackend):
    """In-memory cache fallback when Redis is not available"""

    def __init__(self, max_size: int = 1000):
        self._cache: dict = {}
        self._ttl: dict = {}
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            # Check TTL
            if key in self._ttl and datetime.now().timestamp() > self._ttl[key]:
                del self._cache[key]
                del self._ttl[key]
                self._misses += 1
                return None
            self._hits += 1
            return self._cache[key]
        self._misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        # Evict if full
        if len(self._cache) >= self._max_size:
            # Remove oldest 10%
            keys_to_remove = list(self._cache.keys())[:self._max_size // 10]
            for k in keys_to_remove:
                self.delete(k)

        self._cache[key] = value
        self._ttl[key] = datetime.now().timestamp() + ttl
        return True

    def delete(self, key: str) -> bool:
        self._cache.pop(key, None)
        self._ttl.pop(key, None)
        return True

    def clear(self) -> bool:
        self._cache.clear()
        self._ttl.clear()
        return True

    def get_stats(self) -> dict:
        total = self._hits + self._misses
        hit_rate = self._hits / total * 100 if total > 0 else 0
        return {
            'backend': 'memory',
            'size': len(self._cache),
            'max_size': self._max_size,
            'hits': self._hits,
            'misses': self._misses,
            'hit_rate': f'{hit_rate:.1f}%'
        }


class RedisCache(CacheBackend):
    """Redis-based distributed cache"""

    def __init__(self, url: str):
        import redis
        self._client = redis.from_url(url)
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        try:
            value = self._client.get(key)
            if value:
                self._hits += 1
                return json.loads(value)
            self._misses += 1
            return None
        except Exception as e:
            logger.error(f'Redis get error: {e}')
            return None

    def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        try:
            self._client.setex(key, ttl, json.dumps(value))
            return True
        except Exception as e:
            logger.error(f'Redis set error: {e}')
            return False

    def delete(self, key: str) -> bool:
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f'Redis delete error: {e}')
            return False

    def clear(self) -> bool:
        try:
            self._client.flushdb()
            return True
        except Exception as e:
            logger.error(f'Redis clear error: {e}')
            return False

    def get_stats(self) -> dict:
        try:
            info = self._client.info()
            total = self._hits + self._misses
            hit_rate = self._hits / total * 100 if total > 0 else 0
            return {
                'backend': 'redis',
                'connected_clients': info.get('connected_clients', 0),
                'used_memory_human': info.get('used_memory_human', '0B'),
                'keyspace_hits': self._hits,
                'keyspace_misses': self._misses,
                'hit_rate': f'{hit_rate:.1f}%'
            }
        except Exception as e:
            return {'backend': 'redis', 'error': str(e)}


# Singleton cache instance
_cache_instance: Optional[CacheBackend] = None


def get_cache() -> CacheBackend:
    """Get or create cache instance"""
    global _cache_instance

    if _cache_instance is not None:
        return _cache_instance

    if not CACHE_ENABLED:
        # No-op cache
        _cache_instance = MemoryCache(max_size=0)
        return _cache_instance

    if REDIS_URL:
        try:
            _cache_instance = RedisCache(REDIS_URL)
            logger.info('[Cache] Redis cache initialized')
            return _cache_instance
        except Exception as e:
            logger.warning(f'[Cache] Redis connection failed, using memory cache: {e}')

    _cache_instance = MemoryCache()
    logger.info('[Cache] Memory cache initialized')
    return _cache_instance


def cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate cache key from parameters"""
    key_parts = [prefix]
    key_parts.extend(str(arg) for arg in args)
    key_parts.extend(f'{k}={v}' for k, v in sorted(kwargs.items()))
    key_string = ':'.join(key_parts)

    # Hash long keys
    if len(key_string) > 200:
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f'{prefix}:{key_hash}'

    return key_string


def cached(prefix: str, ttl: int = DEFAULT_TTL):
    """
    Decorator for caching function results

    Usage:
        @cached('financial:radar', ttl=3600)
        def get_radar_scores(stock_code: str) -> dict:
            ...
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            cache = get_cache()
            key = cache_key(prefix, *args, **kwargs)

            # Try to get from cache
            cached_result = cache.get(key)
            if cached_result is not None:
                logger.debug(f'[Cache] Hit: {key}')
                return cached_result

            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(key, result, ttl)
            logger.debug(f'[Cache] Set: {key}')

            return result

        return wrapper
    return decorator