"""
Aggregator — Runs all platform scrapers concurrently and returns unified results.

Strategy:
1. First try curl_cffi scrapers (fast, ~1-2s) — works with proxy
2. If curl_cffi returns 0 results, fall back to Playwright browser scraper
3. If browser also returns 0, fall back to mock data

This replaces the old QuickCommerce API dependency entirely.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from .base import BaseScraper
from .blinkit import BlinkitScraper
from .zepto import ZeptoScraper

logger = logging.getLogger("kartify.scrapers.aggregator")

# Thread pool for running sync scrapers concurrently
_executor = ThreadPoolExecutor(max_workers=6, thread_name_prefix="scraper")


def _normalize_text(text: str) -> str:
    """Lowercase alphanum tokens, collapsed whitespace."""
    return " ".join(
        "".join(ch if ch.isalnum() else " " for ch in (text or "").lower()).split()
    )


def _tokens(text: str) -> list[str]:
    return [t for t in _normalize_text(text).split() if t]


NON_GROCERY_TERMS = {
    "truck", "trucks", "toy", "toys", "car", "cars", "lego",
    "action", "figure", "rc", "remote", "game", "gaming",
}


def _score_relevance(query: str, product_name: str, unit: str) -> float:
    """Score how relevant a product is to the search query."""
    query_tokens = _tokens(query)
    if not query_tokens:
        return 0.0

    haystack = f"{product_name} {unit}".strip()
    hay_tokens = _tokens(haystack)
    hay_set = set(hay_tokens)
    norm_hay = _normalize_text(haystack)
    norm_query = _normalize_text(query)

    exact = sum(1 for t in query_tokens if t in hay_set)
    prefix = sum(
        1 for t in query_tokens
        if t not in hay_set and any(h.startswith(t) for h in hay_set)
    )
    phrase_bonus = 0.2 if norm_query and norm_query in norm_hay else 0.0
    coverage = (exact + 0.65 * prefix) / max(len(query_tokens), 1)
    score = coverage + phrase_bonus

    # Penalize non-grocery results
    if any(t in NON_GROCERY_TERMS for t in hay_set):
        if not any(t in NON_GROCERY_TERMS for t in query_tokens):
            score -= 0.5

    return max(0.0, min(1.0, score))


def _deduplicate(results: list[dict]) -> list[dict]:
    """Remove exact duplicates (same name + unit + platform)."""
    seen: dict[str, dict] = {}
    for r in results:
        key = "|".join([
            _normalize_text(r.get("product_name", "")),
            _normalize_text(r.get("unit", "")),
            _normalize_text(r.get("platform", "")),
        ])
        existing = seen.get(key)
        if existing is None:
            seen[key] = r
        else:
            # Keep the one with better data
            if r.get("in_stock") and not existing.get("in_stock"):
                seen[key] = r
            elif r.get("price", 0) > 0 and (existing.get("price", 0) <= 0 or r["price"] < existing["price"]):
                seen[key] = r
    return list(seen.values())


def _filter_relevant(results: list[dict], query: str) -> list[dict]:
    """Filter out irrelevant results based on relevance score."""
    query_tokens = _tokens(query)
    if not query_tokens:
        return results

    threshold = 0.52 if len(query_tokens) == 1 else 0.46
    strict = [r for r in results if r.get("relevance_score", 0) >= threshold]
    if strict:
        return strict

    relaxed = [r for r in results if r.get("relevance_score", 0) >= 0.3]
    return relaxed if relaxed else results


def _run_scraper(scraper: BaseScraper, query: str, lat: float, lon: float) -> list[dict]:
    """Run a single curl_cffi scraper (called from thread pool)."""
    try:
        return scraper.search(query, lat=lat, lon=lon)
    except Exception as e:
        logger.error(f"[{scraper.platform_name}] Scraper failed: {e}")
        return []


async def _run_browser_scrapers(query: str, lat: float, lon: float) -> list[dict]:
    """Fallback: run Playwright browser scrapers."""
    try:
        from .browser_scraper import BrowserScraper
        browser = BrowserScraper(headless=True)

        # Run both platforms concurrently
        blinkit_task = browser.scrape_blinkit(query, lat=lat, lon=lon)
        zepto_task = browser.scrape_zepto(query, lat=lat, lon=lon)

        blinkit_results, zepto_results = await asyncio.gather(
            blinkit_task, zepto_task, return_exceptions=True
        )

        all_results = []
        if isinstance(blinkit_results, list):
            all_results.extend(blinkit_results)
        else:
            logger.error(f"[browser-blinkit] Exception: {blinkit_results}")

        if isinstance(zepto_results, list):
            all_results.extend(zepto_results)
        else:
            logger.error(f"[browser-zepto] Exception: {zepto_results}")

        return all_results
    except Exception as e:
        logger.error(f"[browser-aggregator] Failed: {e}")
        return []


async def search_products(
    query: str,
    lat: float | None = None,
    lon: float | None = None,
    pincode: str | None = None,
    proxy_url: str | None = None,
) -> list[dict]:
    """
    Main entry point - replaces the old search_products from quickcommerce.py.

    Strategy:
    1. Try fast curl_cffi scrapers first
    2. Fall back to Playwright browser scraper if no results
    3. Score, deduplicate, filter, and sort
    """
    # Default coordinates (Gurgaon, NCR)
    effective_lat = lat if lat is not None else 28.4595
    effective_lon = lon if lon is not None else 77.0266

    # ── Step 1: Try fast curl_cffi scrapers ──
    scrapers: list[BaseScraper] = [
        BlinkitScraper(proxy_url=proxy_url),
        ZeptoScraper(proxy_url=proxy_url),
    ]

    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(
            _executor, _run_scraper, scraper, query, effective_lat, effective_lon
        )
        for scraper in scrapers
    ]

    results_per_platform = await asyncio.gather(*tasks, return_exceptions=True)

    all_results: list[dict] = []
    for i, result in enumerate(results_per_platform):
        if isinstance(result, Exception):
            logger.error(f"[aggregator] Scraper {scrapers[i].platform_name} exception: {result}")
            continue
        if isinstance(result, list):
            all_results.extend(result)

    logger.info(f"[aggregator] curl_cffi phase: {len(all_results)} results for '{query}'")

    # ── Step 2: Fall back to Playwright browser if no results ──
    if not all_results:
        logger.info(f"[aggregator] No curl_cffi results, trying browser scraper...")
        browser_results = await _run_browser_scrapers(query, effective_lat, effective_lon)
        all_results.extend(browser_results)
        logger.info(f"[aggregator] Browser phase: {len(browser_results)} results for '{query}'")

    if not all_results:
        logger.warning(f"[aggregator] No results from any scraper for '{query}'")
        return []

    # ── Step 3: Score, deduplicate, filter, sort ──
    for r in all_results:
        r["relevance_score"] = _score_relevance(
            query, r.get("product_name", ""), r.get("unit", "")
        )

    deduped = _deduplicate(all_results)
    filtered = _filter_relevant(deduped, query)

    filtered.sort(
        key=lambda r: (
            -(r.get("relevance_score", 0)),
            not r.get("in_stock", True),
            (r.get("price", 0) or 0) <= 0,
            r.get("price", 0) or 0,
        )
    )

    return filtered
