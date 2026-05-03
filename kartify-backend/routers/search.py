"""
Search Router — Product search via QuickCommerce API + enrichment pipeline.

Pipeline:
  1. Query QuickCommerce API across all platforms in parallel
  2. Normalize + group same products across platforms
  3. Rank by relevance, apply sort + filters
  4. Cache grouped results in Redis
"""

import asyncio
import hashlib
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from middleware.auth import get_current_user
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

# QuickCommerce API config
QC_BASE = "https://api.quickcommerceapi.com/v1"
QC_KEY = settings.QUICKCOMMERCE_API_KEY
QC_PLATFORMS = ["BlinkIt", "Zepto", "Swiggy", "BigBasket", "JioMart"]

# Default location (Bangalore) if user doesn't provide one
DEFAULT_LAT = 12.9716
DEFAULT_LON = 77.5946


def _normalize_query(value: str) -> str:
    return " ".join(value.strip().lower().split())


async def _fetch_platform(
    client: httpx.AsyncClient, query: str, platform: str, lat: float, lon: float
) -> list[dict]:
    """Fetch products from one platform via QuickCommerce API."""
    try:
        resp = await client.get(
            f"{QC_BASE}/search",
            params={"q": query, "lat": lat, "lon": lon, "platform": platform},
            headers={"X-API-Key": QC_KEY},
            timeout=10.0,
        )
        if resp.status_code != 200:
            logger.warning(f"QC API {platform}: HTTP {resp.status_code}")
            return []

        data = resp.json()
        products = data.get("products", [])

        # Normalize to our internal format
        results = []
        for p in products:
            plat_info = p.get("platform", {})
            results.append({
                "product_name": f"{p.get('brand', '')} {p.get('name', '')}".strip(),
                "brand": p.get("brand", ""),
                "platform": platform.lower().replace("blinkit", "blinkit").replace("swiggy", "instamart"),
                "price": p.get("offer_price") or p.get("mrp", 0),
                "original_price": p.get("mrp", 0),
                "unit": p.get("quantity", ""),
                "image_url": (p.get("images") or [""])[0],
                "eta_minutes": None,
                "eta": plat_info.get("sla", ""),
                "in_stock": p.get("available", True),
                "deeplink": p.get("deeplink", ""),
                "rating": p.get("rating"),
                "rating_count": p.get("rating_count"),
                "inventory": p.get("inventory", 0),
                "platform_product_id": str(p.get("id", "")),
            })
        return results
    except Exception as e:
        logger.warning(f"QC API {platform} error: {e}")
        return []


async def _search_all_platforms(query: str, lat: float, lon: float) -> list[dict]:
    """Query all platforms in parallel via QuickCommerce API."""
    async with httpx.AsyncClient() as client:
        tasks = [
            _fetch_platform(client, query, plat, lat, lon)
            for plat in QC_PLATFORMS
        ]
        results = await asyncio.gather(*tasks)
    
    # Flatten all platform results into one list
    all_products = []
    for platform_results in results:
        all_products.extend(platform_results)
    return all_products


def _platform_display_name(raw: str) -> str:
    """Normalize platform names for display."""
    mapping = {
        "blinkit": "blinkit",
        "zepto": "zepto",
        "swiggy": "instamart",
        "bigbasket": "bigbasket",
        "jiomart": "jiomart",
        "dmart": "dmart",
        "minutes": "flipkart",
    }
    return mapping.get(raw.lower(), raw.lower())


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

    use_lat = lat or DEFAULT_LAT
    use_lon = lon or DEFAULT_LON

    # Cache key
    cache_key = "search:" + hashlib.md5(
        f"{_normalize_query(q)}:{sort}:{platform}:{use_lat}:{use_lon}".encode()
    ).hexdigest()

    cached_payload = await cache.get_cached(cache_key)
    if cached_payload is not None and isinstance(cached_payload, dict):
        return SearchResponse(**cached_payload)

    # ── STEP 1: Fetch from QuickCommerce API ──
    source = "quickcommerce"
    raw_results = await _search_all_platforms(q, use_lat, use_lon)

    # Fallback to mock if QC API returned nothing
    if not raw_results:
        source = "mock"
        raw_results = search_mock_products(q, lat=use_lat, lon=use_lon, pincode=pincode)

    if not raw_results:
        return SearchResponse(query=q, results=[], count=0, sort=sort, source="empty")

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
        pass

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
