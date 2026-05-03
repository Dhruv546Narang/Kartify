"""
Blinkit Scraper — Fetches product search results from Blinkit (blinkit.com).

Uses Blinkit's internal web API endpoints discovered via browser network
inspection. The API requires lat/lon to determine the nearest dark store.

Endpoint: https://blinkit.com/v6/search/products
Method: GET
Required headers: lat, lon, app_client=web
"""

import logging
from typing import Any

from .base import BaseScraper

logger = logging.getLogger("kartify.scrapers.blinkit")

# Blinkit's internal search endpoint (web client)
BLINKIT_SEARCH_URL = "https://blinkit.com/v6/search/products"

# Alternative endpoints to try if main one fails
BLINKIT_ALT_URLS = [
    "https://blinkit.com/v5/search/products",
    "https://www.blinkit.com/api/v1/search/sub-category-products",
]


class BlinkitScraper(BaseScraper):
    """
    Scraper for Blinkit (formerly Grofers).

    Blinkit's web API returns products in a nested structure:
    {
        "products": [
            {
                "name": "Amul Gold Milk 1L",
                "brand": {"name": "Amul", "id": 123},
                "price": {"value": 72, "mrp": 76},
                "image_url": "https://...",
                "in_stock": true,
                "unit": "1 L",
                ...
            },
            ...
        ],
        "store": {"store_id": "abc123"},
        ...
    }
    """

    platform_name = "blinkit"

    def search(
        self,
        query: str,
        lat: float = 28.4595,  # Default: Gurgaon
        lon: float = 77.0266,
    ) -> list[dict]:
        """Search Blinkit for products matching the query."""

        headers = {
            "lat": str(lat),
            "lon": str(lon),
            "app_client": "web",
            "web_app_version": "2.0.0",
            "Referer": "https://blinkit.com/",
            "Origin": "https://blinkit.com",
        }

        params = {
            "q": query,
            "start": 0,
            "size": 30,
        }

        # Try main endpoint first, then alternates
        urls_to_try = [BLINKIT_SEARCH_URL] + BLINKIT_ALT_URLS
        resp = None

        for url in urls_to_try:
            resp = self._request("GET", url, headers=headers, params=params)
            if resp and resp.status_code == 200:
                break
            logger.info(f"[blinkit] {url} returned {resp.status_code if resp else 'timeout'}, trying next...")

        if not resp or resp.status_code != 200:
            logger.error(f"[blinkit] All endpoints failed for query: {query}")
            return []

        try:
            data = resp.json()
        except Exception as e:
            logger.error(f"[blinkit] Failed to parse JSON: {e}")
            return []

        return self._normalize_results(data, query)

    def _normalize_results(self, data: dict, query: str) -> list[dict]:
        """Normalize Blinkit's response into Kartify's standard schema."""
        products = []

        # Blinkit returns products under "products" key
        raw_products = data.get("products", [])
        if not raw_products and isinstance(data.get("data"), dict):
            raw_products = data["data"].get("products", [])

        store_info = data.get("store", {})
        store_id = store_info.get("store_id", "")

        for item in raw_products:
            if not isinstance(item, dict):
                continue

            # Extract product name — Blinkit usually has it under "name"
            name = str(
                self._pick(item, ("name", "product_name", "title"), "Unknown")
            ).strip()
            if not name or name == "Unknown":
                continue

            # Extract brand and prepend to name if not already present
            brand_info = item.get("brand", {})
            brand_name = ""
            if isinstance(brand_info, dict):
                brand_name = str(brand_info.get("name", "")).strip()
            elif isinstance(brand_info, str):
                brand_name = brand_info.strip()

            # If brand is not already in the product name, prepend it
            if brand_name and not name.lower().startswith(brand_name.lower()):
                name = f"{brand_name} {name}"

            # Extract pricing
            price_info = item.get("price", {})
            if isinstance(price_info, dict):
                price = self._safe_float(price_info.get("value") or price_info.get("offer_price") or price_info.get("selling_price"), 0)
                mrp = self._safe_float(price_info.get("mrp") or price_info.get("marked_price"), 0)
            else:
                price = self._safe_float(self._pick(item, ("price", "offer_price", "selling_price"), 0))
                mrp = self._safe_float(self._pick(item, ("mrp", "marked_price"), 0))

            if price <= 0:
                price = mrp  # fallback

            # Extract unit/quantity
            unit = str(self._pick(item, ("unit", "quantity", "size", "weight"), "")).strip()

            # Extract image
            image_url = str(self._pick(item, ("image_url", "image", "thumbnail"), "")).strip()
            # Blinkit sometimes returns relative URLs or CDN paths
            if image_url and not image_url.startswith("http"):
                image_url = f"https://cdn.blinkit.com/{image_url}"

            # Extract ETA
            eta = self._safe_int(self._pick(item, ("eta_minutes", "eta", "delivery_eta", "sla"), None))

            # Stock status
            in_stock = self._safe_bool(self._pick(item, ("in_stock", "available", "is_available"), True))

            products.append({
                "product_name": name,
                "platform": "blinkit",
                "price": price,
                "unit": unit,
                "image_url": image_url,
                "eta_minutes": eta,
                "platform_product_id": str(item.get("id", item.get("variant_id", ""))),
                "in_stock": in_stock,
                "store_name": store_id,
                "distance_km": None,
                "brand": brand_name,
            })

        logger.info(f"[blinkit] Scraped {len(products)} products for '{query}'")
        return products
