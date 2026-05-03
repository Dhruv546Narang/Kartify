"""
History Router — User search history endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user
from services.supabase import supabase
from pydantic import BaseModel

router = APIRouter(prefix="/history", tags=["History"])


class HistoryEntry(BaseModel):
    id: str
    user_id: str
    query: str
    searched_at: str | None = None


class HistoryResponse(BaseModel):
    entries: list[HistoryEntry]
    total: int


@router.get("", response_model=HistoryResponse)
async def get_history(current_user: dict = Depends(get_current_user)):
    """Get the current user's search history, most recent first."""
    try:
        result = (
            supabase.table("search_history")
            .select("*")
            .eq("user_id", current_user["user_id"])
            .order("searched_at", desc=True)
            .limit(50)
            .execute()
        )
        entries = result.data or []
        return HistoryResponse(
            entries=[HistoryEntry(**entry) for entry in entries],
            total=len(entries),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch history: {str(e)}"
        )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Clear the current user's search history."""
    try:
        supabase.table("search_history").delete().eq(
            "user_id", current_user["user_id"]
        ).execute()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to clear history: {str(e)}"
        )
