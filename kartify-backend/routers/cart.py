"""
Cart Router — CRUD operations for user carts and cart items.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from middleware.auth import get_current_user
from services.supabase import supabase
from models.cart import (
    CartCreateRequest,
    CartItemAddRequest,
    CartItemResponse,
    CartResponse,
)

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("", response_model=list[CartResponse])
async def get_carts(current_user: dict = Depends(get_current_user)):
    """Get all carts for the current user."""
    try:
        result = (
            supabase.table("carts")
            .select("*")
            .eq("user_id", current_user["user_id"])
            .order("created_at", desc=True)
            .execute()
        )
        carts = []
        for cart_data in result.data or []:
            items_result = (
                supabase.table("cart_items")
                .select("*")
                .eq("cart_id", cart_data["id"])
                .execute()
            )
            items = items_result.data or []
            total = sum(item["price"] * item["quantity"] for item in items)
            carts.append(
                CartResponse(
                    **cart_data,
                    items=[CartItemResponse(**i) for i in items],
                    total=total,
                )
            )
        return carts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch carts: {str(e)}")


@router.post("", response_model=CartResponse, status_code=status.HTTP_201_CREATED)
async def create_cart(
    request: CartCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new cart."""
    try:
        result = (
            supabase.table("carts")
            .insert(
                {
                    "user_id": current_user["user_id"],
                    "name": request.name,
                    "is_active": True,
                }
            )
            .execute()
        )
        cart = result.data[0]
        return CartResponse(**cart, items=[], total=0.0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create cart: {str(e)}")


@router.get("/{cart_id}", response_model=CartResponse)
async def get_cart(cart_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific cart with its items."""
    try:
        cart_result = (
            supabase.table("carts")
            .select("*")
            .eq("id", cart_id)
            .eq("user_id", current_user["user_id"])
            .single()
            .execute()
        )
        if not cart_result.data:
            raise HTTPException(status_code=404, detail="Cart not found")

        items_result = (
            supabase.table("cart_items").select("*").eq("cart_id", cart_id).execute()
        )
        items = items_result.data or []
        total = sum(item["price"] * item["quantity"] for item in items)

        return CartResponse(
            **cart_result.data,
            items=[CartItemResponse(**i) for i in items],
            total=total,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch cart: {str(e)}")


@router.post(
    "/{cart_id}/items",
    response_model=CartItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_item_to_cart(
    cart_id: str,
    request: CartItemAddRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add an item to a cart."""
    # Verify cart ownership
    cart = (
        supabase.table("carts")
        .select("id")
        .eq("id", cart_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not cart.data:
        raise HTTPException(status_code=404, detail="Cart not found")

    try:
        result = (
            supabase.table("cart_items")
            .insert(
                {
                    "cart_id": cart_id,
                    "product_name": request.product_name,
                    "platform": request.platform,
                    "price": request.price,
                    "quantity": request.quantity,
                    "product_id": request.product_id,
                }
            )
            .execute()
        )
        return CartItemResponse(**result.data[0])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add item: {str(e)}")


@router.delete("/{cart_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item_from_cart(
    cart_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove an item from a cart."""
    # Verify cart ownership
    cart = (
        supabase.table("carts")
        .select("id")
        .eq("id", cart_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not cart.data:
        raise HTTPException(status_code=404, detail="Cart not found")

    supabase.table("cart_items").delete().eq("id", item_id).eq(
        "cart_id", cart_id
    ).execute()


@router.delete("/{cart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart(cart_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a cart and all its items."""
    # Verify cart ownership
    cart = (
        supabase.table("carts")
        .select("id")
        .eq("id", cart_id)
        .eq("user_id", current_user["user_id"])
        .single()
        .execute()
    )
    if not cart.data:
        raise HTTPException(status_code=404, detail="Cart not found")

    # Delete items first, then the cart
    supabase.table("cart_items").delete().eq("cart_id", cart_id).execute()
    supabase.table("carts").delete().eq("id", cart_id).execute()
