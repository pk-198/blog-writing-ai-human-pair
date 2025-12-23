"""
Authentication routes for Creator and Reviewer login.
Handles password verification and JWT token generation.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.core.config import settings
from app.core.security import verify_password, create_access_token, hash_password

router = APIRouter()


class LoginRequest(BaseModel):
    """Login request model."""
    role: str = Field(..., pattern="^(creator|reviewer)$")
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    token_type: str = "bearer"
    role: str


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """
    Authenticate user and return JWT token.

    Args:
        credentials: Login credentials (role and password)

    Returns:
        JWT access token and role information

    Raises:
        HTTPException: If credentials are invalid
    """
    # Get the expected password based on role
    if credentials.role == "creator":
        expected_password = settings.CREATOR_PASSWORD
    elif credentials.role == "reviewer":
        expected_password = settings.REVIEWER_PASSWORD
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'creator' or 'reviewer'"
        )

    # For initial setup, if passwords are not hashed, hash them for comparison
    # In production, passwords should be pre-hashed in the config
    # For now, we'll do a simple string comparison since they're from .env
    if credentials.password != expected_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token with role information
    token_data = {
        "sub": credentials.role,
        "role": credentials.role
    }
    access_token = create_access_token(data=token_data)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        role=credentials.role
    )


@router.get("/verify")
async def verify_token():
    """
    Verify JWT token validity.
    This endpoint will be implemented later with proper token verification middleware.
    """
    return {"status": "Token verification endpoint - to be implemented"}
