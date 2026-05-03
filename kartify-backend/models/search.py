"""
Pydantic models for search requests and responses.
"""

from pydantic import BaseModel


# ── Flat product result (legacy, still used for raw data) ──────

class ProductResult(BaseModel):
    product_name: str
    platform: str
    price: float
    unit: str = ""
    image_url: str = ""
    eta_minutes: int | None = None
    platform_product_id: str = ""
    deeplink: str = ""
    in_stock: bool = True
    store_name: str = ""
    distance_km: float | None = None
    is_nearest_store: bool = False
    relevance_score: float | None = None


# ── Grouped product result (new enriched format) ──────────────

class PlatformPrice(BaseModel):
    platform: str
    price: float
    original_price: float = 0.0
    eta: str = ""
    delivery_fee: float = 0.0
    surge_charge: float = 0.0
    in_stock: bool = True
    platform_product_id: str = ""
    deeplink: str = ""
    store_name: str = ""


class GroupedProduct(BaseModel):
    id: str
    name: str
    brand: str = ""
    unit: str = ""
    image: str = ""
    catalog_id: str | None = None
    platforms: list[PlatformPrice]


class SearchResponse(BaseModel):
    query: str
    results: list[GroupedProduct]
    count: int
    sort: str = "best_match"
    cached: bool = False
    source: str = "live"


# ── Suggestions ───────────────────────────────────────────────

class SearchSuggestionsResponse(BaseModel):
    query: str
    suggestions: list[str]
