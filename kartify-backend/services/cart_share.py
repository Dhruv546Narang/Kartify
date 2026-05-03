"""
Helpers for generating and validating public shared-cart tokens.
"""

from jose import JWTError, jwt
from config import get_settings
from datetime import datetime, timedelta, timezone


def create_share_token(payload: dict) -> tuple[str, int]:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=settings.KARTIFY_SHARE_TOKEN_TTL_HOURS
    )
    encoded = {
        **payload,
        "scope": "shared_cart",
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(
        encoded,
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )
    return token, int(expires_at.timestamp())


def decode_share_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        if payload.get("scope") != "shared_cart":
            raise ValueError("Invalid share token scope.")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid or expired share token: {str(e)}")
