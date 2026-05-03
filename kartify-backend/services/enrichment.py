"""
Product Enrichment — The core brain of Kartify's search pipeline.

Takes raw product results (from scrapers or QuickCommerce API) and enriches
them with canonical brand names and full product names using:
  1. Supabase product_catalog (self-populating cache — fastest)
  2. Open Food Facts API (free, excellent Indian FMCG coverage)
  3. Fallback heuristic (extract brand from first word)

This solves the truncated-name problem where platforms return
"W2 Perfume" instead of "Engage W2 Perfume".
"""

import asyncio
import logging
import re

import httpx
from rapidfuzz import fuzz

from services.supabase import supabase

logger = logging.getLogger("kartify.enrichment")

OFF_BASE = "https://world.openfoodfacts.org"


# ── Name / unit normalization ──────────────────────────────────

def normalize_unit(s: str) -> str:
    """Normalize quantity strings so 1L == 1 Litre == 1000ml."""
    s = s.lower().strip()
    s = re.sub(r"\s+", "", s)
    s = s.replace("litre", "l").replace("liter", "l")
    s = s.replace("millilitre", "ml").replace("milliliter", "ml")
    s = s.replace("kilogram", "kg").replace("gram", "g")
    s = s.replace("pieces", "pc").replace("piece", "pc").replace("pcs", "pc")
    # Convert common equivalents
    s = re.sub(r"1000ml", "1l", s)
    s = re.sub(r"500ml", "0.5l", s)
    # Handle NxMunit (e.g. 6x100ml -> 600ml)
    m = re.match(r"(\d+)x(\d+)(ml|g|l|kg)", s)
    if m:
        s = str(int(m.group(1)) * int(m.group(2))) + m.group(3)
    return s


def extract_unit_from_name(name: str) -> str:
    """Pull quantity out of a product name if not provided separately."""
    pattern = r"(\d+\.?\d*)\s*(ml|l|kg|g|gm|litre|liter|millilitre|oz|lb)"
    m = re.search(pattern, name.lower())
    if m:
        return normalize_unit(m.group(1) + m.group(2))
    pattern2 = r"(\d+)\s*(pc|pcs|piece|pieces|pack|tab|tablet|capsule)"
    m2 = re.search(pattern2, name.lower())
    if m2:
        return m2.group(1) + m2.group(2)
    return ""


# ── Open Food Facts lookup ─────────────────────────────────────

async def lookup_off_by_name(query: str) -> dict | None:
    """
    Search Open Food Facts for a product by name.
    Returns canonical { brand, full_name, image_url, unit, off_id } or None.
    OFF has excellent Indian FMCG coverage.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{OFF_BASE}/cgi/search.pl",
                params={
                    "search_terms": query,
                    "search_simple": 1,
                    "action": "process",
                    "json": 1,
                    "page_size": 5,
                    "lc": "en",
                    "countries_tags": "india",
                },
            )
            data = resp.json()
            products = data.get("products", [])

            if not products:
                # Retry without India filter for broader results
                resp2 = await client.get(
                    f"{OFF_BASE}/cgi/search.pl",
                    params={
                        "search_terms": query,
                        "search_simple": 1,
                        "action": "process",
                        "json": 1,
                        "page_size": 3,
                    },
                )
                products = resp2.json().get("products", [])

            if not products:
                return None

            # Pick the best match by fuzzy name similarity
            best = max(
                products,
                key=lambda p: fuzz.partial_ratio(
                    query.lower(),
                    (p.get("product_name", "") + " " + p.get("brands", "")).lower(),
                ),
            )

            brand = best.get("brands", "").split(",")[0].strip().title()
            product_name = best.get("product_name", "").strip()
            image = best.get("image_front_url") or best.get("image_url") or ""
            quantity = normalize_unit(best.get("quantity", ""))

            if not brand or not product_name:
                return None

            # Build full canonical name: "Brand ProductName"
            # Only prepend brand if not already in product_name
            if brand.lower() not in product_name.lower():
                full_name = f"{brand} {product_name}"
            else:
                full_name = product_name

            return {
                "brand": brand,
                "full_name": full_name,
                "image_url": image,
                "unit": quantity,
                "off_id": best.get("id") or best.get("code", ""),
            }
    except Exception as e:
        logger.warning(f"OFF lookup failed for '{query}': {e}")
        return None


# ── Supabase catalog cache ─────────────────────────────────────

async def lookup_supabase_catalog(raw_name: str, unit: str) -> dict | None:
    """
    Check our own Supabase product_catalog before hitting OFF.
    The catalog is self-populating — it grows every time we enrich
    a new product via OFF.
    """
    try:
        result = (
            supabase.table("product_catalog")
            .select("*")
            .ilike("aliases", f"%{raw_name.lower()}%")
            .limit(5)
            .execute()
        )

        if result.data:
            best = max(
                result.data,
                key=lambda p: fuzz.partial_ratio(
                    raw_name.lower(), p.get("raw_names", "").lower()
                ),
            )
            if fuzz.partial_ratio(raw_name.lower(), best.get("raw_names", "").lower()) > 70:
                return {
                    "brand": best["brand"],
                    "full_name": best["canonical_name"],
                    "image_url": best.get("image_url", ""),
                    "unit": best.get("unit") or unit,
                    "catalog_id": best["id"],
                }
    except Exception as e:
        logger.debug(f"Supabase catalog lookup failed: {e}")
    return None


async def save_to_catalog(raw_name: str, enriched: dict, unit: str):
    """
    Save a newly enriched product to our Supabase catalog so the
    next lookup is instant (no OFF network call needed).
    """
    try:
        existing = (
            supabase.table("product_catalog")
            .select("id, raw_names")
            .ilike("canonical_name", enriched["full_name"])
            .limit(1)
            .execute()
        )

        if existing.data:
            # Append this raw_name as a known alias
            row = existing.data[0]
            current_names = row.get("raw_names", "")
            if raw_name.lower() not in current_names.lower():
                supabase.table("product_catalog").update(
                    {"raw_names": current_names + "|" + raw_name.lower()}
                ).eq("id", row["id"]).execute()
        else:
            # New product — insert into catalog
            supabase.table("product_catalog").insert(
                {
                    "canonical_name": enriched["full_name"],
                    "brand": enriched["brand"],
                    "image_url": enriched.get("image_url", ""),
                    "unit": unit or enriched.get("unit", ""),
                    "raw_names": raw_name.lower(),
                    "aliases": raw_name.lower(),
                    "off_id": enriched.get("off_id", ""),
                }
            ).execute()
    except Exception as e:
        logger.warning(f"Catalog save failed (non-critical): {e}")


# ── Main enrichment function ──────────────────────────────────

async def enrich_product(raw_name: str, unit: str = "") -> dict:
    """
    Given a raw product name (e.g. "W1 Perfume"), return enriched
    data with canonical brand + full name (e.g. "Engage W1 Perfume").

    Priority: Supabase catalog -> Open Food Facts -> fallback to raw name
    """
    unit = unit or extract_unit_from_name(raw_name)

    # 1. Check our own catalog first (fastest, free)
    catalog_result = await lookup_supabase_catalog(raw_name, unit)
    if catalog_result:
        return catalog_result

    # 2. Hit Open Food Facts
    off_result = await lookup_off_by_name(raw_name)
    if off_result:
        # Save to catalog for future instant lookups (fire-and-forget)
        asyncio.create_task(save_to_catalog(raw_name, off_result, unit))
        return off_result

    # 3. Fallback — return raw name, no enrichment
    return {
        "brand": raw_name.split()[0] if raw_name else "Unknown",
        "full_name": raw_name,
        "image_url": "",
        "unit": unit,
        "catalog_id": None,
    }


# ── Batch enrichment ──────────────────────────────────────────

async def enrich_products_batch(raw_products: list[dict]) -> list[dict]:
    """
    Enrich a list of raw products concurrently.
    Adds canonical brand + full name to each product.
    """

    async def enrich_one(product: dict) -> dict:
        raw_name = (
            product.get("product_name")
            or product.get("productName")
            or product.get("name")
            or product.get("title")
            or ""
        ).strip()

        unit = str(
            product.get("unit")
            or product.get("quantity")
            or product.get("weight")
            or extract_unit_from_name(raw_name)
        )

        enriched = await enrich_product(raw_name, unit)

        return {
            **product,
            "product_name": enriched["full_name"],  # canonical name
            "brand": enriched["brand"],
            "unit": enriched["unit"] or unit,
            "image_url": product.get("image_url")
            or product.get("image")
            or product.get("imageUrl")
            or enriched["image_url"],
            "_raw_name": raw_name,                  # keep original for debugging
            "_catalog_id": enriched.get("catalog_id"),
        }

    # Run all enrichments concurrently (cap at 10 parallel OFF calls)
    semaphore = asyncio.Semaphore(10)

    async def bounded_enrich(product):
        async with semaphore:
            return await enrich_one(product)

    results = await asyncio.gather(
        *[bounded_enrich(p) for p in raw_products]
    )
    return list(results)
