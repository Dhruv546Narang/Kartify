"""
Playwright-based scraper — Uses a real headless browser to scrape
Blinkit and Zepto search results by intercepting their API calls.

This approach works because:
1. The browser handles TLS fingerprinting, cookies, and JS execution
2. We intercept the XHR/fetch requests to capture raw JSON responses
3. No bot detection because it IS a real browser

The scraper:
1. Opens the website in headless Chromium
2. Sets a delivery location via lat/lon
3. Performs a search query
4. Intercepts the API response containing product data
5. Extracts and normalizes the products
"""

import asyncio
import json
import logging
import re
from typing import Any

from playwright.async_api import async_playwright, Page, Response

logger = logging.getLogger("kartify.scrapers.browser")


class BrowserScraper:
    """
    Scrapes Blinkit and Zepto by loading them in a headless browser
    and intercepting the search API responses.
    """

    def __init__(self, headless: bool = True):
        self.headless = headless

    async def scrape_blinkit(
        self, query: str, lat: float = 28.4595, lon: float = 77.0266
    ) -> list[dict]:
        """Scrape Blinkit search results by intercepting API calls."""
        products: list[dict] = []
        captured_responses: list[dict] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                locale="en-IN",
                timezone_id="Asia/Kolkata",
                geolocation={"latitude": lat, "longitude": lon},
                permissions=["geolocation"],
            )

            page = await context.new_page()

            # Intercept API responses that contain product data
            async def handle_response(response: Response):
                try:
                    url = response.url
                    if response.status == 200 and any(
                        kw in url for kw in ["search", "products", "listing"]
                    ):
                        content_type = response.headers.get("content-type", "")
                        if "json" in content_type:
                            data = await response.json()
                            captured_responses.append({"url": url, "data": data})
                except Exception:
                    pass

            page.on("response", handle_response)

            try:
                # Navigate to Blinkit with location cookies
                await page.goto(
                    f"https://blinkit.com/s/?q={query}",
                    wait_until="domcontentloaded",
                    timeout=8000,
                )

                # Wait for results to load
                await page.wait_for_timeout(1500)

                # If we captured API responses, extract products from them
                for resp_data in captured_responses:
                    data = resp_data["data"]
                    raw_products = self._extract_blinkit_products(data)
                    for item in raw_products:
                        products.append(self._normalize_blinkit_product(item))

                # Fallback: if no API interception, try scraping the DOM
                if not products:
                    products = await self._scrape_blinkit_dom(page)

            except Exception as e:
                logger.error(f"[blinkit-browser] Error: {e}")
            finally:
                await browser.close()

        logger.info(f"[blinkit-browser] Got {len(products)} products for '{query}'")
        return products

    async def scrape_zepto(
        self, query: str, lat: float = 19.0760, lon: float = 72.8777
    ) -> list[dict]:
        """Scrape Zepto search results by intercepting API calls."""
        products: list[dict] = []
        captured_responses: list[dict] = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                locale="en-IN",
                timezone_id="Asia/Kolkata",
                geolocation={"latitude": lat, "longitude": lon},
                permissions=["geolocation"],
            )

            page = await context.new_page()

            # Intercept API responses
            async def handle_response(response: Response):
                try:
                    url = response.url
                    if response.status == 200 and any(
                        kw in url for kw in ["search", "products", "listing", "layout"]
                    ):
                        content_type = response.headers.get("content-type", "")
                        if "json" in content_type:
                            data = await response.json()
                            captured_responses.append({"url": url, "data": data})
                except Exception:
                    pass

            page.on("response", handle_response)

            try:
                # Navigate to Zepto search
                await page.goto(
                    f"https://www.zeptonow.com/search?query={query}",
                    wait_until="domcontentloaded",
                    timeout=8000,
                )
                await page.wait_for_timeout(1500)

                # Extract from intercepted API calls
                for resp_data in captured_responses:
                    data = resp_data["data"]
                    raw_products = self._extract_zepto_products(data)
                    for item in raw_products:
                        products.append(self._normalize_zepto_product(item))

                # Fallback: scrape DOM
                if not products:
                    products = await self._scrape_zepto_dom(page)

            except Exception as e:
                logger.error(f"[zepto-browser] Error: {e}")
            finally:
                await browser.close()

        logger.info(f"[zepto-browser] Got {len(products)} products for '{query}'")
        return products

    # ── Blinkit extraction helpers ─────────────────────────

    def _extract_blinkit_products(self, data: Any) -> list[dict]:
        """Extract products from Blinkit's API response."""
        if isinstance(data, dict):
            products = data.get("products", [])
            if products:
                return [p for p in products if isinstance(p, dict)]
            # Try nested
            for key in ("data", "results", "items"):
                nested = data.get(key)
                if isinstance(nested, list):
                    return [p for p in nested if isinstance(p, dict)]
                if isinstance(nested, dict):
                    return self._extract_blinkit_products(nested)
        return []

    def _normalize_blinkit_product(self, item: dict) -> dict:
        """Normalize a single Blinkit product."""
        name = str(item.get("name", item.get("product_name", "Unknown"))).strip()

        # Extract and prepend brand
        brand_info = item.get("brand", {})
        brand = ""
        if isinstance(brand_info, dict):
            brand = str(brand_info.get("name", "")).strip()
        elif isinstance(brand_info, str):
            brand = brand_info.strip()
        if brand and not name.lower().startswith(brand.lower()):
            name = f"{brand} {name}"

        # Price
        price_info = item.get("price", {})
        if isinstance(price_info, dict):
            price = self._safe_float(price_info.get("value") or price_info.get("offer_price"), 0)
            mrp = self._safe_float(price_info.get("mrp"), 0)
        else:
            price = self._safe_float(item.get("price", item.get("offer_price")), 0)
            mrp = self._safe_float(item.get("mrp"), 0)

        unit = str(item.get("unit", item.get("quantity", ""))).strip()
        image = str(item.get("image_url", item.get("image", ""))).strip()

        return {
            "product_name": name,
            "platform": "blinkit",
            "price": price if price > 0 else mrp,
            "unit": unit,
            "image_url": image,
            "eta_minutes": self._safe_int(item.get("eta_minutes", item.get("sla"))),
            "platform_product_id": str(item.get("id", "")),
            "in_stock": item.get("in_stock", True),
            "store_name": "",
            "distance_km": None,
            "brand": brand,
        }

    async def _scrape_blinkit_dom(self, page: Page) -> list[dict]:
        """Fallback: scrape product cards from the Blinkit DOM."""
        products = []
        try:
            # Blinkit product cards usually have specific class patterns
            cards = await page.query_selector_all('[data-testid*="product"], .product-card, .Product__UpdatedPlpProductContainer-sc')
            if not cards:
                # Try generic approach
                cards = await page.query_selector_all('div[class*="Product"]')

            for card in cards[:30]:
                try:
                    name_el = await card.query_selector('div[class*="Name"], div[class*="name"], [class*="product-name"]')
                    price_el = await card.query_selector('div[class*="Price"], div[class*="price"], [class*="selling-price"]')
                    img_el = await card.query_selector('img')
                    unit_el = await card.query_selector('div[class*="Unit"], div[class*="unit"], div[class*="weight"]')

                    name = await name_el.inner_text() if name_el else ""
                    price_text = await price_el.inner_text() if price_el else "0"
                    image = await img_el.get_attribute("src") if img_el else ""
                    unit = await unit_el.inner_text() if unit_el else ""

                    # Parse price from text like "Rs. 72" or "72"
                    price_digits = re.findall(r'[\d.]+', price_text)
                    price = float(price_digits[0]) if price_digits else 0

                    if name and name.strip():
                        products.append({
                            "product_name": name.strip(),
                            "platform": "blinkit",
                            "price": price,
                            "unit": unit.strip(),
                            "image_url": image or "",
                            "eta_minutes": None,
                            "platform_product_id": "",
                            "in_stock": True,
                            "store_name": "",
                            "distance_km": None,
                            "brand": "",
                        })
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"[blinkit-dom] DOM scraping failed: {e}")

        return products

    # ── Zepto extraction helpers ───────────────────────────

    def _extract_zepto_products(self, data: Any) -> list[dict]:
        """Extract products from Zepto's API response."""
        if isinstance(data, dict):
            for key in ("products", "items", "results", "storeProducts"):
                val = data.get(key)
                if isinstance(val, list) and val:
                    return [p for p in val if isinstance(p, dict)]
            nested = data.get("data")
            if isinstance(nested, dict):
                return self._extract_zepto_products(nested)
            if isinstance(nested, list):
                return [p for p in nested if isinstance(p, dict)]
            # Layout-based
            layout = data.get("layout", [])
            if isinstance(layout, list):
                extracted = []
                for block in layout:
                    if isinstance(block, dict):
                        wd = block.get("data", block.get("widget_data", {}))
                        if isinstance(wd, dict):
                            items = wd.get("products", wd.get("items", []))
                            if isinstance(items, list):
                                extracted.extend(p for p in items if isinstance(p, dict))
                if extracted:
                    return extracted
        return []

    def _normalize_zepto_product(self, item: dict) -> dict:
        """Normalize a single Zepto product."""
        name = str(item.get("name", item.get("productName", "Unknown"))).strip()

        brand = ""
        brand_info = item.get("brand", item.get("brandName", ""))
        if isinstance(brand_info, dict):
            brand = str(brand_info.get("name", "")).strip()
        elif isinstance(brand_info, str):
            brand = brand_info.strip()
        if brand and not name.lower().startswith(brand.lower()):
            name = f"{brand} {name}"

        price = self._safe_float(
            item.get("sellingPrice", item.get("price", item.get("offer_price"))), 0
        )
        mrp = self._safe_float(item.get("mrp", item.get("markedPrice")), 0)
        unit = str(item.get("unit", item.get("quantity", item.get("packSize", "")))).strip()

        image = str(item.get("image", item.get("imageUrl", item.get("image_url", "")))).strip()
        images = item.get("images", [])
        if not image and isinstance(images, list) and images:
            first = images[0]
            image = first if isinstance(first, str) else first.get("url", "") if isinstance(first, dict) else ""

        return {
            "product_name": name,
            "platform": "zepto",
            "price": price if price > 0 else mrp,
            "unit": unit,
            "image_url": image,
            "eta_minutes": self._safe_int(item.get("eta", item.get("deliveryEta"))),
            "platform_product_id": str(item.get("id", item.get("productId", ""))),
            "in_stock": item.get("inStock", item.get("in_stock", True)),
            "store_name": "",
            "distance_km": None,
            "brand": brand,
        }

    async def _scrape_zepto_dom(self, page: Page) -> list[dict]:
        """Fallback: scrape product cards from the Zepto DOM."""
        products = []
        try:
            cards = await page.query_selector_all('[data-testid*="product"], [class*="product-card"], [class*="ProductCard"]')
            if not cards:
                cards = await page.query_selector_all('div[class*="product"]')

            for card in cards[:30]:
                try:
                    name_el = await card.query_selector('h5, h4, [class*="name"], [class*="Name"], [class*="title"]')
                    price_el = await card.query_selector('[class*="price"], [class*="Price"]')
                    img_el = await card.query_selector('img')
                    unit_el = await card.query_selector('[class*="unit"], [class*="quantity"], [class*="weight"]')

                    name = await name_el.inner_text() if name_el else ""
                    price_text = await price_el.inner_text() if price_el else "0"
                    image = await img_el.get_attribute("src") if img_el else ""
                    unit = await unit_el.inner_text() if unit_el else ""

                    price_digits = re.findall(r'[\d.]+', price_text)
                    price = float(price_digits[0]) if price_digits else 0

                    if name and name.strip():
                        products.append({
                            "product_name": name.strip(),
                            "platform": "zepto",
                            "price": price,
                            "unit": unit.strip(),
                            "image_url": image or "",
                            "eta_minutes": None,
                            "platform_product_id": "",
                            "in_stock": True,
                            "store_name": "",
                            "distance_km": None,
                            "brand": "",
                        })
                except Exception:
                    continue
        except Exception as e:
            logger.warning(f"[zepto-dom] DOM scraping failed: {e}")
        return products

    # ── Utils ──────────────────────────────────────────────

    @staticmethod
    def _safe_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _safe_int(value: Any) -> int | None:
        try:
            if value is None or value == "":
                return None
            return int(float(value))
        except (TypeError, ValueError):
            return None
