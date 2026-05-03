"""
Deals & trending endpoints — surfaces price drops and popular products.
"""
from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from services.supabase import supabase

router = APIRouter()

# Mock trending deals until price_snapshots table is populated
TRENDING_DEALS = [
    {"id": "td1", "name": "Tata Salt", "brand": "Tata", "unit": "1 kg", "old_price": 28, "price": 24, "platform": "bigbasket", "drop_pct": 14, "image": ""},
    {"id": "td2", "name": "Lay's Classic Salted", "brand": "Lay's", "unit": "52 g", "old_price": 20, "price": 17, "platform": "zepto", "drop_pct": 15, "image": ""},
    {"id": "td3", "name": "Nescafé Classic", "brand": "Nescafé", "unit": "50 g", "old_price": 165, "price": 149, "platform": "blinkit", "drop_pct": 10, "image": ""},
    {"id": "td4", "name": "Surf Excel Easy Wash", "brand": "Surf Excel", "unit": "1 kg", "old_price": 125, "price": 110, "platform": "jiomart", "drop_pct": 12, "image": ""},
    {"id": "td5", "name": "Amul Gold Milk", "brand": "Amul", "unit": "1 L", "old_price": 70, "price": 66, "platform": "jiomart", "drop_pct": 6, "image": ""},
    {"id": "td6", "name": "Monster Energy Drink", "brand": "Monster", "unit": "350 ml", "old_price": 135, "price": 125, "platform": "blinkit", "drop_pct": 7, "image": ""},
]


@router.get("/deals/trending")
async def get_trending_deals(user=Depends(get_current_user)):
    """Return today's best price drops across platforms."""
    return {"deals": TRENDING_DEALS, "count": len(TRENDING_DEALS)}


@router.get("/deals/categories")
async def get_deal_categories(user=Depends(get_current_user)):
    """Return product categories for the home screen."""
    categories = [
        {"id": "fruits", "label": "Fruits & Veg", "emoji": "🥬", "color": "rgba(122,158,126,0.15)"},
        {"id": "dairy", "label": "Dairy & Eggs", "emoji": "🥛", "color": "rgba(245,200,66,0.15)"},
        {"id": "snacks", "label": "Snacks", "emoji": "🍿", "color": "rgba(196,133,90,0.15)"},
        {"id": "beverages", "label": "Beverages", "emoji": "🥤", "color": "rgba(139,92,246,0.15)"},
        {"id": "household", "label": "Household", "emoji": "🧹", "color": "rgba(59,139,212,0.15)"},
        {"id": "personal", "label": "Personal Care", "emoji": "🧴", "color": "rgba(255,107,53,0.15)"},
        {"id": "meat", "label": "Meat & Fish", "emoji": "🥩", "color": "rgba(196,80,74,0.15)"},
        {"id": "baby", "label": "Baby & Kids", "emoji": "👶", "color": "rgba(255,200,87,0.15)"},
    ]
    return {"categories": categories}
