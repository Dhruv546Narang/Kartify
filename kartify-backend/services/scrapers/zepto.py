"""
Zepto Scraper — Fetches product search results from Zepto (zeptonow.com).

Zepto's web app uses a GraphQL-like internal API or a REST search endpoint.
The search requires store context (store_id) which is determined by location.

Step 1: Hit the store-locator endpoint to get the store_id for the lat/lon.
Step 2: Hit the search endpoint with the store_id to get products.
"""

import logging
from typing import Any

from .base import BaseScraper

logger = logging.getLogger("kartify.scrapers.zepto")

# Zepto's internal endpoints (discovered via browser inspection)
ZEPTO_STORE_URL = "https://api.zeptonow.com/api/v3/getStoreAddress"
ZEPTO_SEARCH_URL = "https://api.zeptonow.com/api/v3/search"

# Alternative domains to try
ZEPTO_ALT_DOMAINS = [
    "https://www.zeptonow.com/api/v3/search",
    "https://web.zeptonow.com/api/v3/search",
]


class ZeptoScraper(BaseScraper):
    """
    Scraper for Zepto.

    Zepto's API is more restrictive — it requires a valid store_id
    in the headers. We first resolve the nearest store, then search.
    """

    platform_name = "zepto"

    def _get_store_id(self, lat: float, lon: float) -> str | None:
        """Resolve the nearest Zepto store for the given coordinates."""
        headers = {
            "Referer": "https://www.zeptonow.com/",
            "Origin": "https://www.zeptonow.com",
            "Content-Type": "application/json",
        }

        json_data = {
            "lat": lat,
            "lng": lon,
        }

        try:
            resp = self._request("POST", ZEPTO_STORE_URL, headers=headers, json_data=json_data)
            if resp and resp.status_code == 200:
                data = resp.json()
                # Zepto returns store info in various formats
                store_id = (
                    data.get("storeId")
                    or data.get("store_id")
                    or (data.get("data", {}).get("storeId") if isinstance(data.get("data"), dict) else None)
                )
                if store_id:
                    logger.info(f"[zepto] Resolved store_id: {store_id}")
                    return str(store_id)
        except Exception as e:
            logger.warning(f"[zepto] Store resolution failed: {e}")

        return None

    def search(
        self,
        query: str,
        lat: float = 19.0760,  # Default: Mumbai
        lon: float = 72.8777,
    ) -> list[dict]:
        """Search Zepto for products matching the query."""

        # Step 1: Resolve store
        store_id = self._get_store_id(lat, lon)

        headers = {
            "Referer": "https://www.zeptonow.com/",
            "Origin": "https://www.zeptonow.com",
            "Content-Type": "application/json",
            "platform": "web",
            "appVersion": "12.50.0",
        }
        if store_id:
            headers["storeId"] = store_id

        # Try POST-based search first (newer Zepto API)
        json_data = {
            "query": query,
            "pageNumber": 0,
            "mode": "AUTOSUGGEST",
        }

        urls_to_try = [ZEPTO_SEARCH_URL] + ZEPTO_ALT_DOMAINS
        resp = None

        for url in urls_to_try:
            resp = self._request("POST", url, headers=headers, json_data=json_data)
            if resp and resp.status_code == 200:
                break

            # Try GET variant
            get_params = {"query": query, "page": 0}
            resp = self._request("GET", url, headers=headers, params=get_params)
            if resp and resp.status_code == 200:
                break

            logger.info(f"[zepto] {url} returned {resp.status_code if resp else 'timeout'}, trying next...")

        if not resp or resp.status_code != 200:
            logger.error(f"[zepto] All endpoints failed for query: {query}")
            return []

        try:
            data = resp.json()
        except Exception as e:
            logger.error(f"[zepto] Failed to parse JSON: {e}")
            return []

        return self._normalize_results(data, query)

    def _normalize_results(self, data: dict, query: str) -> list[dict]:
        """Normalize Zepto's response into Kartify's standard schema."""
        products = []

        # Zepto nests products in various structures
        raw_products = self._extract_products(data)

        for item in raw_products:
            if not isinstance(item, dict):
                continue

            # Extract product name
            name = str(
                self._pick(item, ("name", "product_name", "productName", "title"), "Unknown")
            ).strip()
            if not name or name == "Unknown":
                continue

            # Extract brand
            brand_name = ""
            brand_info = item.get("brand", item.get("brandName", ""))
            if isinstance(brand_info, dict):
                brand_name = str(brand_info.get("name", "")).strip()
            elif isinstance(brand_info, str):
                brand_name = brand_info.strip()

            # Prepend brand if not in name
            if brand_name and not name.lower().startswith(brand_name.lower()):
                name = f"{brand_name} {name}"

            # Pricing
            price = self._safe_float(
                self._pick(item, ("sellingPrice", "selling_price", "price", "offerPrice", "offer_price"), 0)
            )
            mrp = self._safe_float(
                self._pick(item, ("mrp", "markedPrice", "marked_price", "originalPrice"), 0)
            )
            if price <= 0:
                price = mrp

            # Unit
            unit = str(self._pick(item, ("unit", "quantity", "packSize", "weight", "size"), "")).strip()

            # Image
            image_url = str(self._pick(item, ("image", "imageUrl", "image_url", "thumbnail"), "")).strip()
            # Handle Zepto image format
            images = item.get("images", [])
            if isinstance(images, list) and images and not image_url:
                first_img = images[0]
                if isinstance(first_img, str):
                    image_url = first_img
                elif isinstance(first_img, dict):
                    image_url = first_img.get("url", first_img.get("path", ""))

            # ETA
            eta_raw = self._pick(item, ("eta", "deliveryEta", "delivery_eta", "sla"), None)
            eta = None
            if isinstance(eta_raw, (int, float)):
                eta = int(eta_raw)
            elif isinstance(eta_raw, str):
                digits = "".join(c for c in eta_raw if c.isdigit())
                eta = int(digits) if digits else None

            # Stock
            in_stock = self._safe_bool(
                self._pick(item, ("inStock", "in_stock", "available", "isAvailable"), True)
            )

            products.append({
                "product_name": name,
                "platform": "zepto",
                "price": price,
                "unit": unit,
                "image_url": image_url,
                "eta_minutes": eta,
                "platform_product_id": str(self._pick(item, ("id", "productId", "product_id", "sku"), "")),
                "in_stock": in_stock,
                "store_name": "",
                "distance_km": None,
                "brand": brand_name,
            })

        logger.info(f"[zepto] Scraped {len(products)} products for '{query}'")
        return products

    def _extract_products(self, data: Any) -> list[dict]:
        """Extract flat list of products from Zepto's nested response."""
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]

        if not isinstance(data, dict):
            return []

        # Direct product arrays
        for key in ("products", "items", "results", "storeProducts"):
            val = data.get(key)
            if isinstance(val, list) and val:
                return [item for item in val if isinstance(item, dict)]

        # Nested under "data"
        nested_data = data.get("data")
        if isinstance(nested_data, dict):
            return self._extract_products(nested_data)
        if isinstance(nested_data, list):
            return [item for item in nested_data if isinstance(item, dict)]

        # Layout-based (Zepto sometimes wraps in layout blocks)
        layout = data.get("layout", [])
        if isinstance(layout, list):
            extracted = []
            for block in layout:
                if isinstance(block, dict):
                    widget_data = block.get("data", block.get("widget_data", {}))
                    if isinstance(widget_data, dict):
                        items = widget_data.get("products", widget_data.get("items", []))
                        if isinstance(items, list):
                            extracted.extend(item for item in items if isinstance(item, dict))
            if extracted:
                return extracted

        return []
