"""
Custom middleware for logging, error handling, and request tracking.
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logger import setup_logger

logger = setup_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses.
    Tracks request duration, status codes, and errors.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:8]

        # Extract request details
        method = request.method
        url = str(request.url)
        client_ip = request.client.host if request.client else "unknown"

        # Start timer
        start_time = time.time()

        # Log incoming request
        logger.info(
            f"[REQ {request_id}] {method} {url} | Client: {client_ip}"
        )

        # Add request ID to request state for access in routes
        request.state.request_id = request_id

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log successful response
            logger.info(
                f"[RES {request_id}] {method} {url} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration_ms:.2f}ms"
            )

            # Log slow requests (>2 seconds)
            if duration_ms > 2000:
                logger.warning(
                    f"[SLOW {request_id}] {method} {url} took {duration_ms:.2f}ms"
                )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # Calculate duration even for errors
            duration_ms = (time.time() - start_time) * 1000

            # Log error
            logger.error(
                f"[ERR {request_id}] {method} {url} | "
                f"Error: {str(e)} | "
                f"Duration: {duration_ms:.2f}ms",
                exc_info=True
            )

            # Re-raise the exception to be handled by FastAPI
            raise


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to catch and log unhandled exceptions.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            # Log the error with full stack trace
            logger.error(
                f"Unhandled exception in {request.method} {request.url}: {str(e)}",
                exc_info=True,
                extra={
                    "method": request.method,
                    "url": str(request.url),
                    "client": request.client.host if request.client else "unknown"
                }
            )

            # Re-raise to let FastAPI handle the response
            raise


def log_startup():
    """Log application startup information."""
    logger.info("=" * 60)
    logger.info("Blog Creation System API - Starting Up")
    logger.info("=" * 60)
    logger.info("FastAPI application initialized")
    logger.info("All routes registered successfully")
    logger.info("Middleware configured")
    logger.info("Ready to accept requests")
    logger.info("=" * 60)


def log_shutdown():
    """Log application shutdown information."""
    logger.info("=" * 60)
    logger.info("Blog Creation System API - Shutting Down")
    logger.info("=" * 60)
    logger.info("Cleaning up resources...")
    logger.info("Goodbye!")
    logger.info("=" * 60)
