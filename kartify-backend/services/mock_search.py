"""
Deterministic mock search results for demo mode when external API credits are unavailable.
"""

from __future__ import annotations

from hashlib import md5
from typing import Any

PLATFORMS = ("blinkit", "zepto", "instamart", "bigbasket", "jiomart")

CATALOG: list[dict[str, Any]] = [
    {
        "name": "Monster Energy Drink",
        "aliases": ["monster", "monster energy", "energy drink"],
        "unit": "500 ml",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Monster+Energy",
        "prices": {"blinkit": 125, "zepto": 129, "instamart": 132, "bigbasket": 135, "jiomart": 133},
    },
    {
        "name": "Monster Ultra White Energy Drink",
        "aliases": ["monster ultra", "monster zero"],
        "unit": "500 ml",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Monster+Ultra",
        "prices": {"blinkit": 131, "zepto": 135, "instamart": 138, "bigbasket": 140, "jiomart": 139},
    },
    {
        "name": "Red Bull Energy Drink",
        "aliases": ["redbull", "energy drink"],
        "unit": "250 ml",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Red+Bull",
        "prices": {"blinkit": 123, "zepto": 126, "instamart": 127, "bigbasket": 130, "jiomart": 128},
    },
    {
        "name": "Amul Gold Full Cream Milk",
        "aliases": ["milk", "amul milk", "full cream milk"],
        "unit": "1 L",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Amul+Milk",
        "prices": {"blinkit": 68, "zepto": 70, "instamart": 69, "bigbasket": 67, "jiomart": 66},
    },
    {
        "name": "Mother Dairy Toned Milk",
        "aliases": ["milk", "toned milk"],
        "unit": "1 L",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Toned+Milk",
        "prices": {"blinkit": 62, "zepto": 63, "instamart": 64, "bigbasket": 61, "jiomart": 60},
    },
    {
        "name": "Farm Fresh Eggs",
        "aliases": ["eggs", "egg tray", "brown eggs"],
        "unit": "12 pcs",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Eggs",
        "prices": {"blinkit": 92, "zepto": 95, "instamart": 94, "bigbasket": 90, "jiomart": 91},
    },
    {
        "name": "Britannia Brown Bread",
        "aliases": ["bread", "brown bread"],
        "unit": "400 g",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Brown+Bread",
        "prices": {"blinkit": 52, "zepto": 54, "instamart": 53, "bigbasket": 51, "jiomart": 50},
    },
    {
        "name": "Aashirvaad Atta",
        "aliases": ["atta", "flour", "wheat flour"],
        "unit": "5 kg",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Aata",
        "prices": {"blinkit": 292, "zepto": 299, "instamart": 301, "bigbasket": 289, "jiomart": 294},
    },
    {
        "name": "Lay's Classic Salted Chips",
        "aliases": ["chips", "lays", "snacks"],
        "unit": "52 g",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Lays",
        "prices": {"blinkit": 20, "zepto": 20, "instamart": 21, "bigbasket": 19, "jiomart": 20},
    },
    {
        "name": "Engage W2 Perfume Spray For Women",
        "aliases": ["perfume", "engage", "w2", "spray", "fragrance"],
        "unit": "120 ml",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=W2+Perfume",
        "prices": {"blinkit": 195, "zepto": 199, "instamart": 190, "bigbasket": 210, "jiomart": 185},
    },
    {
        "name": "Sony WH-1000XM5 Wireless Headphones",
        "aliases": ["sony", "headphones", "audio", "electronics"],
        "unit": "1 Unit",
        "image_url": "https://dummyimage.com/320x320/e6f2e8/1f3a2e.png&text=Sony+Headphones",
        "prices": {"blinkit": 24990, "zepto": 0, "instamart": 0, "bigbasket": 0, "jiomart": 24500},
    },
]

DEFAULT_SUGGESTIONS = [
    "Engage Perfume",
    "Monster Energy Drink",
    "Milk 1 litre",
    "Eggs 12 pcs",
    "Bread",
    "Aata 5kg",
    "Banana",
    "Curd",
    "Cold drink",
]


def _normalize(text: str) -> str:
    return " ".join("".join(ch if ch.isalnum() else " " for ch in (text or "").lower()).split())


def _tokens(text: str) -> list[str]:
    return [token for token in _normalize(text).split(" ") if token]


def _score(query: str, item: dict[str, Any]) -> float:
    query_tokens = _tokens(query)
    if not query_tokens:
        return 0.0

    haystack = " ".join(
        [
            _normalize(str(item.get("name", ""))),
            _normalize(" ".join(item.get("aliases", []))),
        ]
    ).strip()
    hay_tokens = set(haystack.split(" "))

    exact = sum(1 for token in query_tokens if token in hay_tokens)
    prefix = sum(
        1
        for token in query_tokens
        if token not in hay_tokens and any(candidate.startswith(token) for candidate in hay_tokens)
    )
    phrase_bonus = 0.2 if _normalize(query) in haystack else 0.0
    coverage = (exact + 0.7 * prefix) / max(len(query_tokens), 1)
    return min(1.0, coverage + phrase_bonus)


def _distance_km_seed(*parts: str) -> float:
    digest = md5("|".join(parts).encode("utf-8")).hexdigest()
    value = int(digest[:6], 16)
    return round(0.7 + (value % 530) / 100, 2)  # 0.70 -> 5.99 km


def _location_hint(lat: float | None, lon: float | None, pincode: str | None) -> str:
    if pincode:
        return f"PIN {pincode}"
    if lat is not None and lon is not None:
        return f"{lat:.3f},{lon:.3f}"
    return "default"


def _store_name(platform: str, location_hint: str) -> str:
    platform_label = platform[0].upper() + platform[1:]
    return f"{platform_label} Nearby Hub ({location_hint})"


def search_mock_products(
    query: str,
    lat: float | None = None,
    lon: float | None = None,
    pincode: str | None = None,
) -> list[dict[str, Any]]:
    location_hint = _location_hint(lat, lon, pincode)

    scored: list[tuple[float, dict[str, Any]]] = []
    for item in CATALOG:
        score = _score(query, item)
        if score >= 0.35:
            scored.append((score, item))

    if not scored:
        # fallback: keep top catalog entries for broad discovery
        scored = [(0.4, item) for item in CATALOG[:4]]

    results: list[dict[str, Any]] = []
    for score, product in sorted(scored, key=lambda pair: pair[0], reverse=True)[:8]:
        for platform in PLATFORMS:
            base_price = float(product["prices"].get(platform, 0))
            if base_price <= 0:
                continue

            distance_km = _distance_km_seed(
                _normalize(product["name"]),
                platform,
                location_hint,
            )
            results.append(
                {
                    "product_name": product["name"],
                    "platform": platform,
                    "price": base_price,
                    "unit": product["unit"],
                    "image_url": product["image_url"],
                    "eta_minutes": max(8, min(35, int(distance_km * 6))),
                    "platform_product_id": f"mock-{platform}-{_normalize(product['name']).replace(' ', '-')}",
                    "deeplink": "",
                    "in_stock": True,
                    "store_name": _store_name(platform, location_hint),
                    "distance_km": distance_km,
                    "is_nearest_store": True,
                    "relevance_score": round(score, 3),
                }
            )

    results.sort(
        key=lambda row: (
            -(row.get("relevance_score") or 0.0),
            row.get("distance_km") is None,
            row.get("distance_km") or 9999,
            row.get("price", 0),
        )
    )
    return results
