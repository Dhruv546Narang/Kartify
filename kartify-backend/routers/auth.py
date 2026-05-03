"""
Auth Router — Signup, Login, and User Profile endpoints.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from models.auth import SignupRequest, LoginRequest, UserResponse, AuthResponse
from services.supabase import supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    """Register a new user with email and password."""
    try:
        # Sign up via Supabase Auth
        response = supabase.auth.sign_up(
            {
                "email": request.email,
                "password": request.password,
                "options": {"data": {"name": request.name}},
            }
        )

        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed. The email may already be registered.",
            )

        # Insert user profile into the users table
        supabase.table("users").insert(
            {
                "id": response.user.id,
                "email": request.email,
                "name": request.name,
            }
        ).execute()

        return AuthResponse(
            user=UserResponse(
                id=response.user.id,
                email=request.email,
                name=request.name,
            ),
            access_token=response.session.access_token if response.session else "",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup error: {str(e)}",
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Authenticate a user and return a JWT."""
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": request.email, "password": request.password}
        )

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Fetch user profile from users table (if present)
        profile_result = (
            supabase.table("users")
            .select("*")
            .eq("id", response.user.id)
            .limit(1)
            .execute()
        )
        profile_rows = (
            profile_result.data
            if isinstance(profile_result.data, list)
            else [profile_result.data]
            if profile_result.data
            else []
        )
        profile = profile_rows[0] if profile_rows else None
        name = profile.get("name") if profile else None

        return AuthResponse(
            user=UserResponse(
                id=response.user.id,
                email=response.user.email,
                name=name,
            ),
            access_token=response.session.access_token,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}",
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    try:
        profile_result = (
            supabase.table("users")
            .select("*")
            .eq("id", current_user["user_id"])
            .limit(1)
            .execute()
        )
        profile_rows = (
            profile_result.data
            if isinstance(profile_result.data, list)
            else [profile_result.data]
            if profile_result.data
            else []
        )
        profile = profile_rows[0] if profile_rows else None

        if not profile:
            return UserResponse(
                id=current_user["user_id"],
                email=current_user.get("email", ""),
                name=None,
            )

        return UserResponse(
            id=profile["id"],
            email=profile.get("email", current_user.get("email", "")),
            name=profile.get("name"),
            created_at=profile.get("created_at"),
            preferred_platform=profile.get("preferred_platform"),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile: {str(e)}",
        )
