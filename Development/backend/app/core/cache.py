"""
In-process TTL cache
====================
A small, thread-safe, size-bounded cache with per-entry expiry. No external
service (Redis/Memorystore) is needed.

Each server process keeps its own copy, so with several instances a value may
be cached in one and not another. That is fine for the two uses below because
every entry is short-lived and every invalidation happens in the same request
path that changes the underlying data.

Used for:
  • ``token_cache``      - verified Firebase ID tokens (skips a network call
                           to Firebase on every authenticated request)
  • ``lease_text_cache`` - redacted lease text, so chat does not re-download
                           the same object from storage for every message
"""

import threading
import time
from collections import OrderedDict
from typing import Any, Callable, Hashable


class TTLCache:
    """Least-recently-used cache whose entries also expire after ``ttl`` seconds."""

    def __init__(self, maxsize: int, ttl: float) -> None:
        self.maxsize = maxsize
        self.ttl = ttl
        self._data: "OrderedDict[Hashable, tuple[float, Any]]" = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: Hashable) -> Any | None:
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= time.monotonic():
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: Hashable, value: Any, ttl: float | None = None) -> None:
        lifetime = self.ttl if ttl is None else min(ttl, self.ttl)
        if lifetime <= 0:
            return
        with self._lock:
            self._data[key] = (time.monotonic() + lifetime, value)
            self._data.move_to_end(key)
            while len(self._data) > self.maxsize:
                self._data.popitem(last=False)

    def delete(self, key: Hashable) -> None:
        with self._lock:
            self._data.pop(key, None)

    def delete_where(self, predicate: Callable[[Any], bool]) -> None:
        """Remove every entry whose value matches ``predicate``."""
        with self._lock:
            for key in [k for k, (_, v) in self._data.items() if predicate(v)]:
                del self._data[key]

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def __len__(self) -> int:
        return len(self._data)


# Verified ID tokens. 60 s keeps a revoked token from another process / device
# usable for at most a minute; revocations made through this app are applied
# immediately (see app.core.firebase.revoke_refresh_tokens).
token_cache = TTLCache(maxsize=2048, ttl=60)

# Redacted lease text keyed by storage object key. Invalidated on delete
# (see app.services.document.s3.delete_from_s3).
lease_text_cache = TTLCache(maxsize=128, ttl=600)
