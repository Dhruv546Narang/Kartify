"""
Redis/Upstash cache helper.
Provides caching and rate-limiting utilities.
"""

import json
import httpx
from config import get_settings


class RedisCache:
    """Upstash Redis REST API client."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.redis_url
        self.token = settings.redis_token
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def _request(self, command: list) -> dict:
        """Send a command to Upstash Redis REST API."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.base_url,
                headers=self.headers,
                json=command,
                timeout=5.0,
            )
            response.raise_for_status()
            return response.json()

    async def get(self, key: str) -> str | None:
        """Get a cached value by key."""
        try:
            result = await self._request(["GET", key])
            return result.get("result")
        except Exception:
            return None

    async def set(self, key: str, value: str, ttl_seconds: int = 600) -> bool:
        """Set a cached value with TTL (default 10 minutes)."""
        try:
            await self._request(["SET", key, value, "EX", str(ttl_seconds)])
            return True
        except Exception:
            return False

    async def get_cached(self, key: str) -> dict | list | None:
        """Get a cached JSON value."""
        raw = await self.get(key)
        if raw:
            return json.loads(raw)
        return None

    async def set_cached(self, key: str, data: dict | list, ttl_seconds: int = 600) -> bool:
        """Cache a JSON-serializable value."""
        return await self.set(key, json.dumps(data), ttl_seconds)

    async def rate_limit_check(self, user_id: str, limit: int = 60, window: int = 60) -> bool:
        """
        Sliding window rate limiter.
        Returns True if the request is ALLOWED, False if rate-limited.
        """
        key = f"ratelimit:{user_id}"
        try:
            result = await self._request(["INCR", key])
            count = int(result.get("result", 0))

            if count == 1:
                # First request in window — set expiry
                await self._request(["EXPIRE", key, str(window)])

            return count <= limit
        except Exception:
            # If Redis fails, allow the request (fail-open)
            return True


# Singleton cache instance
cache = RedisCache()
