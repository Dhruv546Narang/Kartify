"""
Product Grouping — Groups enriched products by identity across platforms.

After enrichment, products have canonical brand + name, making grouping
reliable. Two products are grouped if:
  1. Same brand (exact match after normalization)
  2. Same normalized unit/quantity (or one is unknown)
  3. Product name similarity > 80% (rapidfuzz token_sort_ratio)
"""

import logging

from rapidfuzz import fuzz

from services.enrichment import normalize_unit

logger = logging.getLogger("kartify.grouping")


def _make_platform_entry(p: dict) -> dict:
    """Extract platform-specific data from a product dict."""
    # Handle eta — could be int, string, or None
    eta_raw = p.get("eta_minutes") or p.get("eta") or p.get("delivery_time") or ""
    if isinstance(eta_raw, (int, float)):
        eta = f"{int(eta_raw)} min"
    else:
        eta = str(eta_raw).strip()

    return {
        "platform": (p.get("platform") or p.get("source") or "unknown").strip().lower(),
        "price": float(p.get("price") or p.get("selling_price") or 0),
        "original_price": float(p.get("mrp") or p.get("original_price") or 0),
        "eta": eta,
        "delivery_fee": float(p.get("delivery_fee") or 0),
        "surge_charge": float(p.get("surge_charge") or 0),
        "in_stock": p.get("in_stock") if p.get("in_stock") is not None else True,
        "platform_product_id": str(p.get("platform_product_id", "")),
        "deeplink": str(p.get("deeplink", "")),
        "store_name": str(p.get("store_name", "")),
    }


def group_enriched_products(products: list[dict]) -> list[dict]:
    """
    Group products that are the same SKU across platforms.
    Now that names are enriched with canonical brands, grouping
    is much more accurate than raw-name Jaccard overlap.
    """
    groups: list[dict] = []
    used: set[int] = set()

    for i, product in enumerate(products):
        if i in used:
            continue

        brand_a = (product.get("brand") or "").strip().lower()
        unit_a = normalize_unit(product.get("unit") or "")
        name_a = (product.get("product_name") or product.get("name") or "").strip().lower()

        group = {
            "id": str(i),
            "name": product.get("product_name") or product.get("name") or product.get("_raw_name", ""),
            "brand": product.get("brand") or "",
            "unit": product.get("unit") or "",
            "image": product.get("image_url") or product.get("image") or "",
            "catalog_id": product.get("_catalog_id"),
            "platforms": [],
        }

        group["platforms"].append(_make_platform_entry(product))
        used.add(i)

        for j, other in enumerate(products):
            if j in used:
                continue

            brand_b = (other.get("brand") or "").strip().lower()
            unit_b = normalize_unit(other.get("unit") or "")
            name_b = (other.get("product_name") or other.get("name") or "").strip().lower()

            # Rule 1: brands must match (if both are known)
            if brand_a and brand_b and brand_a != brand_b:
                continue

            # Rule 2: units must match (if both are known)
            if unit_a and unit_b and unit_a != unit_b:
                continue

            # Rule 3: names must be similar
            similarity = fuzz.token_sort_ratio(name_a, name_b)
            if similarity < 80:
                continue

            # Use the longer (more complete) name as canonical
            other_name = other.get("product_name") or other.get("name") or ""
            if len(other_name) > len(group["name"]):
                group["name"] = other_name

            # Use image if current group has none
            other_image = other.get("image_url") or other.get("image") or ""
            if not group["image"] and other_image:
                group["image"] = other_image

            group["platforms"].append(_make_platform_entry(other))
            used.add(j)

        # Sort platforms cheapest first
        group["platforms"].sort(key=lambda p: p["price"] if p["price"] > 0 else 999999)

        # Deduplicate same platform (keep cheapest)
        seen_platforms: dict[str, bool] = {}
        deduped: list[dict] = []
        for p in group["platforms"]:
            key = p["platform"].lower()
            if key not in seen_platforms:
                seen_platforms[key] = True
                deduped.append(p)
        group["platforms"] = deduped

        groups.append(group)

    return groups


def rank_groups(groups: list[dict], query: str) -> list[dict]:
    """
    Rank grouped results so exact brand + name matches come first.
    """
    query_words = query.lower().strip().split()
    query_brand = query_words[0] if query_words else ""

    def score(group: dict) -> float:
        brand = (group.get("brand") or "").lower()
        name = (group.get("name") or "").lower()

        # Exact brand match -> highest priority
        if brand == query_brand:
            return 1000.0 + fuzz.partial_ratio(query.lower(), name)

        # Brand starts with query brand
        if brand.startswith(query_brand):
            return 800.0 + fuzz.partial_ratio(query.lower(), name)

        # All query words present in name
        if all(w in name for w in query_words):
            return 600.0 + fuzz.partial_ratio(query.lower(), name)

        # Partial match
        return float(fuzz.partial_ratio(query.lower(), name))

    return sorted(groups, key=score, reverse=True)
