"""
Response Cache System
Caches high-quality responses to improve consistency and reduce LLM calls.
"""

import json
import hashlib
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import threading


@dataclass
class CacheEntry:
    """A cached response entry"""
    query_hash: str
    query: str
    response: str
    score: float  # Quality score (0-1)
    metrics: Dict[str, Any]
    created_at: float
    last_used: float
    use_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        return {
            'query_hash': self.query_hash,
            'query': self.query,
            'response': self.response,
            'score': self.score,
            'metrics': self.metrics,
            'created_at': self.created_at,
            'last_used': self.last_used,
            'use_count': self.use_count,
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'CacheEntry':
        return cls(
            query_hash=data['query_hash'],
            query=data['query'],
            response=data['response'],
            score=data['score'],
            metrics=data['metrics'],
            created_at=data['created_at'],
            last_used=data['last_used'],
            use_count=data.get('use_count', 0),
            metadata=data.get('metadata', {})
        )


class ResponseCache:
    """
    Intelligent response cache that:
    1. Caches high-quality responses (score >= threshold)
    2. Evicts low-quality or stale entries
    3. Tracks usage patterns
    4. Persists to disk for restarts
    """

    def __init__(
        self,
        cache_dir: Optional[Path] = None,
        quality_threshold: float = 0.7,
        max_entries: int = 1000,
        ttl_seconds: int = 86400 * 7  # 7 days
    ):
        """
        Initialize response cache.

        Args:
            cache_dir: Directory to store cache files
            quality_threshold: Minimum score to cache (default 0.7)
            max_entries: Maximum number of entries
            ttl_seconds: Time-to-live in seconds
        """
        self.cache_dir = cache_dir or Path.home() / '.cache' / 'investment_research'
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.quality_threshold = quality_threshold
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds

        self.cache: Dict[str, CacheEntry] = {}
        self.lock = threading.Lock()

        # Load existing cache
        self._load_cache()

    def _hash_query(self, query: str, context: Optional[str] = None) -> str:
        """Generate a unique hash for a query"""
        content = query.lower().strip()
        if context:
            content += f"|{context}"
        return hashlib.md5(content.encode()).hexdigest()[:16]

    def _get_cache_file(self) -> Path:
        """Get the cache file path"""
        return self.cache_dir / 'response_cache.json'

    def _load_cache(self):
        """Load cache from disk"""
        cache_file = self._get_cache_file()
        if not cache_file.exists():
            return

        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            current_time = time.time()
            for hash_key, entry_data in data.items():
                entry = CacheEntry.from_dict(entry_data)
                # Skip expired entries
                if current_time - entry.created_at > self.ttl_seconds:
                    continue
                # Skip low-quality entries
                if entry.score < self.quality_threshold:
                    continue
                self.cache[hash_key] = entry

            print(f"[Cache] Loaded {len(self.cache)} valid entries")
        except Exception as e:
            print(f"[Cache] Error loading cache: {e}")

    def _save_cache(self):
        """Save cache to disk"""
        cache_file = self._get_cache_file()
        try:
            data = {k: v.to_dict() for k, v in self.cache.items()}
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[Cache] Error saving cache: {e}")

    def get(
        self,
        query: str,
        context: Optional[str] = None,
        min_score: Optional[float] = None
    ) -> Optional[Tuple[str, float]]:
        """
        Get cached response if available.

        Args:
            query: The query string
            context: Optional context (e.g., company name)
            min_score: Minimum score threshold override

        Returns:
            Tuple of (response, score) or None if not found
        """
        query_hash = self._hash_query(query, context)
        min_score = min_score or self.quality_threshold

        with self.lock:
            entry = self.cache.get(query_hash)
            if not entry:
                return None

            # Check quality
            if entry.score < min_score:
                return None

            # Check expiration
            if time.time() - entry.created_at > self.ttl_seconds:
                del self.cache[query_hash]
                return None

            # Update usage stats
            entry.last_used = time.time()
            entry.use_count += 1

            return entry.response, entry.score

    def put(
        self,
        query: str,
        response: str,
        score: float,
        metrics: Optional[Dict[str, Any]] = None,
        context: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Store a response in cache if quality is high enough.

        Args:
            query: The query string
            response: The response to cache
            score: Quality score (0-1)
            metrics: Extracted metrics
            context: Optional context
            metadata: Optional metadata

        Returns:
            True if cached, False otherwise
        """
        # Don't cache low-quality responses
        if score < self.quality_threshold:
            return False

        query_hash = self._hash_query(query, context)
        current_time = time.time()

        entry = CacheEntry(
            query_hash=query_hash,
            query=query,
            response=response,
            score=score,
            metrics=metrics or {},
            created_at=current_time,
            last_used=current_time,
            use_count=0,
            metadata=metadata or {}
        )

        with self.lock:
            # Evict old entries if at capacity
            if len(self.cache) >= self.max_entries:
                self._evict_entries()

            self.cache[query_hash] = entry
            self._save_cache()

        print(f"[Cache] Stored response with score {score:.2%}")
        return True

    def _evict_entries(self):
        """Evict low-quality or stale entries"""
        current_time = time.time()

        # Remove expired entries first
        expired = [
            k for k, v in self.cache.items()
            if current_time - v.created_at > self.ttl_seconds
        ]
        for k in expired:
            del self.cache[k]

        # If still over capacity, remove lowest quality entries
        if len(self.cache) >= self.max_entries:
            sorted_entries = sorted(
                self.cache.items(),
                key=lambda x: x[1].score * (1 + x[1].use_count * 0.1)  # Quality + usage bonus
            )
            # Remove bottom 20%
            to_remove = int(self.max_entries * 0.2)
            for k, _ in sorted_entries[:to_remove]:
                del self.cache[k]

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.cache:
            return {'total': 0}

        scores = [e.score for e in self.cache.values()]
        use_counts = [e.use_count for e in self.cache.values()]

        return {
            'total': len(self.cache),
            'avg_score': sum(scores) / len(scores),
            'max_score': max(scores),
            'min_score': min(scores),
            'total_uses': sum(use_counts),
            'high_quality_count': sum(1 for s in scores if s >= 0.8)
        }

    def clear(self):
        """Clear the cache"""
        with self.lock:
            self.cache.clear()
            self._save_cache()


# Global cache instance
_cache_instance: Optional[ResponseCache] = None


def get_cache() -> ResponseCache:
    """Get the global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = ResponseCache()
    return _cache_instance