"""
Pydantic models for authentication requests and responses.
"""

from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    created_at: str | None = None
    preferred_platform: str | None = None


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None
