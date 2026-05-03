"""
Base scraper class — shared infrastructure for all platform scrapers.

Uses curl_cffi for TLS fingerprint impersonation to bypass Cloudflare and
similar bot-protection systems. Supports optional proxy rotation.
"""

import logging
import time
import random
from typing import Any

from curl_cffi import requests as cffi_requests

logger = logging.getLogger("kartify.scrapers")

# Common user-agent strings (Chrome on Windows) for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


class BaseScraper:
    """
    Base class for platform-specific scrapers.

    Subclasses must implement:
        - platform_name: str
        - async search(query, lat, lon) -> list[dict]
    """

    platform_name: str = "unknown"

    def __init__(self, proxy_url: str | None = None, timeout: float = 3.0):
        self.proxy_url = proxy_url
        self.timeout = timeout

    def _get_headers(self, extra: dict | None = None) -> dict:
        """Return base headers with a random User-Agent."""
        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
        if extra:
            headers.update(extra)
        return headers

    def _request(
        self,
        method: str,
        url: str,
        headers: dict | None = None,
        params: dict | None = None,
        json_data: dict | None = None,
        impersonate: str = "chrome",
        max_retries: int = 0,
    ) -> cffi_requests.Response | None:
        """
        Make an HTTP request using curl_cffi with TLS impersonation.
        Retries on failure with exponential backoff.
        """
        final_headers = self._get_headers(headers)
        proxies = {"https": self.proxy_url, "http": self.proxy_url} if self.proxy_url else None

        for attempt in range(max_retries + 1):
            try:
                if method.upper() == "GET":
                    resp = cffi_requests.get(
                        url,
                        headers=final_headers,
                        params=params,
                        impersonate=impersonate,
                        timeout=self.timeout,
                        proxies=proxies,
                    )
                else:
                    resp = cffi_requests.post(
                        url,
                        headers=final_headers,
                        params=params,
                        json=json_data,
                        impersonate=impersonate,
                        timeout=self.timeout,
                        proxies=proxies,
                    )

                if resp.status_code == 200:
                    return resp

                logger.warning(
                    f"[{self.platform_name}] HTTP {resp.status_code} on attempt {attempt + 1}: {url}"
                )

                # Don't retry on 4xx client errors (except 429)
                if 400 <= resp.status_code < 500 and resp.status_code != 429:
                    return resp

            except Exception as e:
                logger.warning(
                    f"[{self.platform_name}] Request error on attempt {attempt + 1}: {e}"
                )

            # Exponential backoff
            if attempt < max_retries:
                delay = (2 ** attempt) + random.uniform(0.1, 0.5)
                time.sleep(delay)

        return None

    def _safe_float(self, value: Any, default: float = 0.0) -> float:
        """Safely convert a value to float."""
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _safe_int(self, value: Any) -> int | None:
        """Safely convert a value to int."""
        try:
            if value is None or value == "":
                return None
            return int(float(value))
        except (TypeError, ValueError):
            return None

    def _safe_bool(self, value: Any, default: bool = True) -> bool:
        """Safely convert a value to bool."""
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return value > 0
        if isinstance(value, str):
            return value.strip().lower() in {"true", "1", "yes", "available", "in_stock"}
        return default

    def _pick(self, data: dict, keys: tuple[str, ...], default: Any = None) -> Any:
        """Pick first non-empty value from a dict by trying multiple keys."""
        for key in keys:
            val = data.get(key)
            if val is not None and val != "":
                return val
        return default
