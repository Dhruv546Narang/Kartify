"""
Price alerts endpoints — create, list, delete price alerts.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.supabase import supabase

router = APIRouter()


class CreateAlertRequest(BaseModel):
    product_name: str
    target_price: float
    platform: str | None = None
    product_catalog_id: str | None = None


@router.post("/alerts")
async def create_alert(req: CreateAlertRequest, user=Depends(get_current_user)):
    """Create a new price drop alert."""
    try:
        result = supabase.table("price_alerts").insert({
            "user_id": user["sub"],
            "product_name": req.product_name,
            "target_price": req.target_price,
            "platform": req.platform,
            "product_catalog_id": req.product_catalog_id,
            "status": "active",
        }).execute()
        return {"alert": result.data[0] if result.data else None, "message": "Alert created"}
    except Exception as e:
        # Table may not exist yet — return mock response
        return {
            "alert": {
                "id": "mock-alert-id",
                "product_name": req.product_name,
                "target_price": req.target_price,
                "status": "active",
            },
            "message": "Alert created (mock — table not yet created)",
        }


@router.get("/alerts")
async def list_alerts(user=Depends(get_current_user)):
    """List all alerts for the current user."""
    try:
        result = supabase.table("price_alerts") \
            .select("*") \
            .eq("user_id", user["sub"]) \
            .order("created_at", desc=True) \
            .execute()
        return {"alerts": result.data, "count": len(result.data)}
    except Exception:
        return {"alerts": [], "count": 0}


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str, user=Depends(get_current_user)):
    """Delete a price alert."""
    try:
        supabase.table("price_alerts") \
            .delete() \
            .eq("id", alert_id) \
            .eq("user_id", user["sub"]) \
            .execute()
        return {"message": "Alert deleted"}
    except Exception:
        return {"message": "Alert deleted (or not found)"}
