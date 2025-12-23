"""
Main FastAPI application entry point for Blog Creation System.
This file initializes the FastAPI app, configures middleware, and registers routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import (
    RequestLoggingMiddleware,
    ErrorLoggingMiddleware,
    log_startup,
    log_shutdown
)
from app.core.logger import setup_logger

logger = setup_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Blog Creation System API",
    description="AI-Human collaborative blog creation system for Dograh",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add logging middleware (order matters - first added = outermost layer)
app.add_middleware(ErrorLoggingMiddleware)
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS - allows frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Frontend URLs from .env
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Startup event
@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    log_startup()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    log_shutdown()


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "message": "Blog Creation System API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


# Register API routers
from app.api.routes import auth, sessions, steps, reviewer

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(steps.router)  # Steps router already has /api/steps prefix defined
app.include_router(reviewer.router, prefix="/api/reviewer", tags=["Reviewer"])


if __name__ == "__main__":
    import uvicorn
    # Run server if executed directly
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Auto-reload on code changes (development only)
    )
