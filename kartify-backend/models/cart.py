"""
Pydantic models for cart requests and responses.
"""

from pydantic import BaseModel
from datetime import datetime


class CartCreateRequest(BaseModel):
    name: str = "My Cart"


class CartItemAddRequest(BaseModel):
    product_name: str
    platform: str
    price: float
    quantity: int = 1
    product_id: str = ""


class CartItemResponse(BaseModel):
    id: str
    cart_id: str
    product_name: str
    platform: str
    price: float
    quantity: int
    product_id: str = ""
    added_at: str | None = None


class CartResponse(BaseModel):
    id: str
    user_id: str
    name: str
    is_active: bool = True
    created_at: str | None = None
    items: list[CartItemResponse] = []
    total: float = 0.0


class CartShareResponse(BaseModel):
    share_token: str
    share_url: str
    expires_in_hours: int


class SharedCartItem(BaseModel):
    product_name: str
    quantity: int
    selected_platform: str
    selected_price: float
    product_id: str = ""


class SharedCartResponse(BaseModel):
    name: str
    items: list[SharedCartItem]
    total: float
    created_by_user_id: str
    expires_at: int


class ImportSharedCartResponse(BaseModel):
    imported_into_cart_id: str
    imported_items: int


class CheckoutHandoffRequest(BaseModel):
    lat: float | None = None
    lon: float | None = None
    pincode: str | None = None


class PlatformSummary(BaseModel):
    platform: str
    item_count: int
    coverage: int
    estimated_total: float
    max_eta_minutes: int | None = None
    total_savings_vs_selected: float = 0.0
    checkout_url: str = ""


class CheckoutItemAlternative(BaseModel):
    product_name: str
    quantity: int
    selected_platform: str
    selected_price: float
    selected_total: float
    recommended_platform: str | None = None
    recommended_price: float | None = None
    recommended_total: float | None = None
    deeplink: str = ""


class CheckoutHandoffResponse(BaseModel):
    recommended_platform: str | None = None
    selected_total: float
    recommended_total: float | None = None
    estimated_savings: float | None = None
    max_eta_minutes: int | None = None
    checkout_url: str = ""
    share_text: str = ""
    platforms: list[PlatformSummary]
    items: list[CheckoutItemAlternative]
