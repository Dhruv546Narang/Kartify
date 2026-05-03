"""
JWT verification middleware for Supabase Auth.
Validates tokens and extracts user information.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.supabase import supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency that verifies the JWT token from the Authorization header.
    Returns the decoded user payload (contains user_id, email, etc.).
    Raises 401 if token is invalid or expired.
    """
    token = credentials.credentials

    try:
        user_response = supabase.auth.get_user(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = getattr(user_response, "user", None) or user_response
    user_id = getattr(user, "id", None)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: no user ID found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "user_id": user_id,
        "email": getattr(user, "email", None),
        "role": getattr(user, "role", "authenticated"),
    }
