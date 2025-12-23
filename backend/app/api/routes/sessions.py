"""
Session management routes for blog creation workflow.
Handles session creation, retrieval, and state management.
"""

from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
from typing import Dict, Any
from urllib.parse import unquote
import json
import os
from pathlib import Path

from app.core.config import settings
from app.models.session import SessionCreate, SessionResponse, SessionState, StepInfo

router = APIRouter()


class SessionCreateRequest(BaseModel):
    """Request model for creating a new session."""
    primary_keyword: str = Field(..., min_length=1, max_length=200)
    blog_type: str = Field(..., min_length=10, description="Blog type with detailed description (minimum 10 words)")


def generate_session_id(keyword: str) -> str:
    """Generate a unique session ID from keyword and timestamp."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    keyword_slug = keyword.lower().replace(" ", "-")[:30]
    return f"session_{timestamp}_{keyword_slug}"


def create_session_directory(session_id: str) -> Path:
    """Create directory structure for a new session."""
    # Get absolute path for sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    session_path = sessions_dir / session_id
    session_path.mkdir(parents=True, exist_ok=True)

    # Create subdirectories
    (session_path / "competitor_content").mkdir(exist_ok=True)
    (session_path / "draft_versions").mkdir(exist_ok=True)

    return session_path


def initialize_session_state(session_id: str, primary_keyword: str, blog_type: str) -> SessionState:
    """Initialize a new session state with all 22 steps."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.SESSION_EXPIRY_HOURS)

    # Initialize all 22 steps
    steps = {}
    step_names = [
        "Search Intent Analysis",
        "Competitor Content Fetch",
        "Competitor Analysis",
        "Expert Opinion/ QnA /WebinarPodcast Points",
        "Secondary Keywords",
        "Blog Clustering",
        "Outline Generation",
        "LLM Optimization Planning",
        "Data Collection",
        "Tools Research",
        "Resource Links",
        "Credibility Elements",
        "Business Info Update",
        "Landing Page Evaluation",
        "Infographic Planning",
        "Title Creation",
        "Blog Draft Generation",
        "FAQ Accordion",
        "Meta Description",
        "AI Signal Removal",
        "Final Review Checklist",
        "Export & Archive"
    ]

    for i, step_name in enumerate(step_names, start=1):
        steps[str(i)] = StepInfo(
            step_number=i,
            step_name=step_name,
            status="pending"
        )

    return SessionState(
        session_id=session_id,
        created_at=now,
        updated_at=now,
        expires_at=expires_at,
        current_step=1,
        status="active",
        primary_keyword=primary_keyword,
        blog_type=blog_type,
        steps=steps
    )


@router.post("/", response_model=SessionResponse)
async def create_session(request: SessionCreateRequest):
    """
    Create a new blog creation session.

    Args:
        request: Session creation request with primary keyword

    Returns:
        Session response with session ID and initial state
    """
    # Generate session ID
    session_id = generate_session_id(request.primary_keyword)

    # Create session directory
    session_path = create_session_directory(session_id)

    # Initialize session state
    session_state = initialize_session_state(session_id, request.primary_keyword, request.blog_type)

    # Save state.json
    state_file = session_path / "state.json"
    with open(state_file, 'w') as f:
        # Convert to dict and handle datetime serialization
        state_dict = session_state.model_dump(mode='json')
        json.dump(state_dict, f, indent=2, default=str)

    # Create empty audit log
    audit_file = session_path / "audit_log.json"
    with open(audit_file, 'w') as f:
        json.dump({
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "entries": []
        }, f, indent=2)

    return SessionResponse(
        session_id=session_id,
        created_at=session_state.created_at,
        current_step=session_state.current_step,
        status=session_state.status,
        primary_keyword=session_state.primary_keyword,
        blog_type=session_state.blog_type
    )


@router.get("/{session_id}", response_model=SessionState)
async def get_session(session_id: str):
    """
    Get session state by ID.

    Args:
        session_id: Unique session identifier

    Returns:
        Complete session state

    Raises:
        HTTPException: If session not found
    """
    # URL decode session_id (though FastAPI usually does this automatically for path params)
    session_id = unquote(session_id)

    # Get absolute path for sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"
    session_path = sessions_dir / session_id
    state_file = session_path / "state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    with open(state_file, 'r') as f:
        state_data = json.load(f)

    return SessionState(**state_data)


@router.get("/active/current")
async def get_active_session():
    """
    Get the currently active session (if any).

    Returns:
        Active session or null if no active session
    """
    # Get absolute path for sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    if not sessions_dir.exists():
        return {"session": None}

    # Find most recent active session
    active_sessions = []
    for session_dir in sessions_dir.iterdir():
        if session_dir.is_dir():
            state_file = session_dir / "state.json"
            if state_file.exists():
                with open(state_file, 'r') as f:
                    state_data = json.load(f)
                    if state_data.get("status") == "active":
                        active_sessions.append(state_data)

    if not active_sessions:
        return {"session": None}

    # Return most recent
    most_recent = max(active_sessions, key=lambda s: s["updated_at"])
    return {"session": most_recent}
