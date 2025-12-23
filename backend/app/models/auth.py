"""
Pydantic models for authentication.
Simple password-based authentication for Creator and Reviewer roles.
"""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Request model for login."""
    role: str = Field(..., pattern="^(creator|reviewer)$")  # Only creator or reviewer
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Response model for successful login."""
    access_token: str
    token_type: str = "bearer"
    role: str  # creator or reviewer
    expires_in: int  # seconds


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    role: str
    username: str  # Will be "creator" or "reviewer"
