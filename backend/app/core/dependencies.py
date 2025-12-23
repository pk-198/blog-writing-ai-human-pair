"""
FastAPI Dependencies
Reusable dependencies for route authentication and authorization.
"""

from typing import Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, str]:
    """
    Dependency to validate JWT token and extract user information.

    Args:
        credentials: HTTP Authorization header with Bearer token

    Returns:
        Dict containing user information (username, role)

    Raises:
        HTTPException: If token is invalid or expired
    """
    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        username: str = payload.get("sub")
        role: str = payload.get("role")

        if username is None or role is None:
            logger.warning("Token missing username or role")
            raise credentials_exception

        logger.debug(f"Authenticated user: {username} (role: {role})")

        return {
            "username": username,
            "role": role
        }

    except JWTError as e:
        logger.warning(f"JWT validation failed: {str(e)}")
        raise credentials_exception


async def get_creator_user(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Dependency to ensure user has Creator role.

    Args:
        current_user: Current authenticated user from get_current_user

    Returns:
        User dict if role is Creator

    Raises:
        HTTPException: If user is not a Creator
    """
    if current_user.get("role") != "creator":
        logger.warning(f"Access denied for user {current_user.get('username')} - not a creator")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creator role required for this operation"
        )

    return current_user


async def get_reviewer_user(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Dependency to ensure user has Reviewer role.

    Args:
        current_user: Current authenticated user from get_current_user

    Returns:
        User dict if role is Reviewer

    Raises:
        HTTPException: If user is not a Reviewer
    """
    if current_user.get("role") != "reviewer":
        logger.warning(f"Access denied for user {current_user.get('username')} - not a reviewer")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviewer role required for this operation"
        )

    return current_user


async def get_any_authenticated_user(
    current_user: Dict = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Dependency to ensure user is authenticated (any role).

    Args:
        current_user: Current authenticated user from get_current_user

    Returns:
        User dict for any authenticated user
    """
    return current_user
