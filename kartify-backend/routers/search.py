"""
Search Router — Product search with enrichment + grouping pipeline.

Pipeline:
  1. Get raw results from scrapers (or mock fallback)
  2. Enrich with canonical brand + name via OFF / Supabase catalog
  3. Group same products across platforms
  4. Rank by relevance, apply sort + filters
  5. Cache grouped results in Redis
"""

import hashlib
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from middleware.auth import get_current_user
from services.scrapers.aggregator import search_products as scraper_search
from services.enrichment import enrich_products_batch
from services.grouping import group_enriched_products, rank_groups
from services.mock_search import search_mock_products, DEFAULT_SUGGESTIONS
from services.cache import cache
from models.search import SearchResponse, SearchSuggestionsResponse
from config import get_settings
from services.supabase import supabase

logger = logging.getLogger("kartify.search")

router = APIRouter(prefix="/search", tags=["Search"])
settings = get_settings()


def _normalize_query(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _rank_suggestion(query: str, candidate: str) -> float:
    normalized_query = _normalize_query(query)
    normalized_candidate = _normalize_query(candidate)
    if not normalized_query:
        return 0.0
    if normalized_candidate == normalized_query:
        return 1.0
    if normalized_candidate.startswith(normalized_query):
        return 0.9
    if normalized_query in normalized_candidate:
        return 0.75
    query_tokens = normalized_query.split(" ")
    candidate_tokens = normalized_candidate.split(" ")
    overlap = sum(1 for token in query_tokens if token in candidate_tokens)
    return overlap / max(len(query_tokens), 1)


@router.get("", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    lat: float | None = Query(
        None, ge=-90, le=90, description="Latitude for location-specific search"
    ),
    lon: float | None = Query(
        None, ge=-180, le=180, description="Longitude for location-specific search"
    ),
    pincode: str | None = Query(None, min_length=4, max_length=10),
    sort: str = Query("best_match", description="Sort: best_match | cheapest | fastest"),
    platform: str | None = Query(None, description="Filter to a single platform"),
    current_user: dict = Depends(get_current_user),
):
    """
    Search for products across all quick commerce platforms.
    Returns enriched, grouped results with per-platform pricing.
    """
    # Rate limit check
    allowed = await cache.rate_limit_check(current_user["user_id"])
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    # Cache key includes sort + platform filter
    cache_key = "search:" + hashlib.md5(
        f"{_normalize_query(q)}:{sort}:{platform}:{lat}:{lon}:{pincode}".encode()
    ).hexdigest()

    # Check cache
    cached_payload = await cache.get_cached(cache_key)
    if cached_payload is not None and isinstance(cached_payload, dict):
        return SearchResponse(**cached_payload)

    # ── STEP 1: Get raw results from scrapers ──
    source = "live"
    raw_results: list[dict] = []

    try:
        raw_results = await scraper_search(q, lat=lat, lon=lon, pincode=pincode)
    except Exception as e:
        logger.warning(f"Scraper search failed: {e}")

    # Fallback to mock if scrapers returned nothing
    if not raw_results and settings.ENABLE_MOCK_SEARCH_FALLBACK:
        source = "mock"
        raw_results = search_mock_products(q, lat=lat, lon=lon, pincode=pincode)

    if not raw_results:
        return SearchResponse(
            query=q, results=[], count=0, sort=sort, source="empty"
        )

    # ── STEP 2: Enrich with canonical brand + name ──
    try:
        enriched = await enrich_products_batch(raw_results)
    except Exception as e:
        logger.warning(f"Enrichment failed, using raw results: {e}")
        enriched = raw_results

    # ── STEP 3: Group same products across platforms ──
    grouped = group_enriched_products(enriched)

    # ── STEP 4: Rank by query relevance ──
    ranked = rank_groups(grouped, q)

    # ── STEP 5: Apply optional platform filter ──
    if platform:
        ranked = [
            {
                **g,
                "platforms": [
                    p for p in g["platforms"]
                    if p["platform"].lower() == platform.lower()
                ],
            }
            for g in ranked
            if any(p["platform"].lower() == platform.lower() for p in g["platforms"])
        ]

    # ── STEP 6: Apply sort ──
    if sort == "cheapest":
        ranked.sort(
            key=lambda g: g["platforms"][0]["price"] if g["platforms"] else 999999
        )
    elif sort == "fastest":
        def _eta_minutes(g: dict) -> int:
            eta = g["platforms"][0].get("eta", "") if g["platforms"] else ""
            nums = [int(x) for x in str(eta).split() if x.isdigit()]
            return nums[0] if nums else 999
        ranked.sort(key=_eta_minutes)

    response_data = {
        "query": q,
        "results": ranked,
        "count": len(ranked),
        "sort": sort,
        "cached": False,
        "source": source,
    }

    # Cache for 30 minutes
    await cache.set_cached(cache_key, response_data, ttl_seconds=1800)

    # Log to search history (fire-and-forget)
    try:
        supabase.table("search_history").insert(
            {"user_id": current_user["user_id"], "query": q}
        ).execute()
    except Exception:
        pass  # Don't fail the request if history logging fails

    return SearchResponse(**response_data)


@router.get("/suggestions", response_model=SearchSuggestionsResponse)
async def search_suggestions(
    q: str = Query("", max_length=100, description="Suggestion seed query"),
    current_user: dict = Depends(get_current_user),
):
    """
    Lightweight search recommendations from user history + curated defaults.
    """
    normalized_query = _normalize_query(q)
    candidates: list[str] = []

    try:
        history_result = (
            supabase.table("search_history")
            .select("query")
            .eq("user_id", current_user["user_id"])
            .order("searched_at", desc=True)
            .limit(50)
            .execute()
        )
        for row in history_result.data or []:
            query_value = str(row.get("query", "")).strip()
            if query_value:
                candidates.append(query_value)
    except Exception:
        # Suggestions should still work without history availability.
        pass

    candidates.extend(DEFAULT_SUGGESTIONS)

    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = _normalize_query(candidate)
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(candidate.strip())

    if not normalized_query:
        return SearchSuggestionsResponse(query=q, suggestions=deduped[:8])

    ranked = sorted(
        deduped,
        key=lambda candidate: _rank_suggestion(normalized_query, candidate),
        reverse=True,
    )
    filtered = [
        candidate
        for candidate in ranked
        if _rank_suggestion(normalized_query, candidate) >= 0.34
    ]
    return SearchSuggestionsResponse(query=q, suggestions=filtered[:8])
