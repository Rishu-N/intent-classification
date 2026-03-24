import hashlib
import time
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class CacheEntry:
    result: Any
    created_at: float = field(default_factory=time.time)
    ttl_seconds: int = 3600


class QueryCache:
    def __init__(self) -> None:
        self._store: dict[str, CacheEntry] = {}
        self._hits = 0
        self._misses = 0

    def _key(self, query: str, mode: str, model_ids: list[str]) -> str:
        raw = f"{query}|{mode}|{'|'.join(sorted(model_ids))}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, query: str, mode: str, model_ids: list[str]) -> Optional[Any]:
        key = self._key(query, mode, model_ids)
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None
        if time.time() - entry.created_at > entry.ttl_seconds:
            del self._store[key]
            self._misses += 1
            return None
        self._hits += 1
        return entry.result

    def set(self, query: str, mode: str, model_ids: list[str], result: Any) -> None:
        key = self._key(query, mode, model_ids)
        self._store[key] = CacheEntry(result=result)

    def clear(self) -> None:
        self._store.clear()
        self._hits = 0
        self._misses = 0

    def stats(self) -> dict:
        total = self._hits + self._misses
        return {
            "entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total, 3) if total else 0.0,
        }


# Global singleton
cache = QueryCache()
