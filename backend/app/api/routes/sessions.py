"""
Session management routes for blog creation workflow.
Handles session creation, retrieval, and state management.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from urllib.parse import unquote
import json
import os
from pathlib import Path

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.session import SessionCreate, SessionResponse, SessionState, StepInfo
from app.utils.file_ops import read_json_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)

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
        "Export & Archive",
        "Final Review Checklist"
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
        schema_version=2,  # New sessions use schema v2 (Steps 21=Export, 22=Checklist)
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


@router.get("/active/list")
async def list_active_sessions(current_user: Dict = Depends(get_current_user)):
    """
    Get all currently active or paused sessions (multi-session support).

    Returns:
        List of active/paused sessions sorted by updated_at (most recent first)
    """
    # Get absolute path for sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    if not sessions_dir.exists():
        return {"sessions": []}

    # Find all active or paused sessions
    active_sessions = []
    for session_dir in sessions_dir.iterdir():
        if session_dir.is_dir():
            state_file = session_dir / "state.json"
            if state_file.exists():
                try:
                    with open(state_file, 'r') as f:
                        state_data = json.load(f)
                        session_status = state_data.get("status")

                        # Include both active and paused sessions
                        if session_status in ["active", "paused"]:
                            # Calculate progress
                            steps = state_data.get("steps", {})
                            schema_version = state_data.get("schema_version", 1)
                            total_steps = 20 if schema_version < 2 else 22

                            steps_completed = sum(
                                1 for step in steps.values()
                                if step.get("status") == "completed"
                            )
                            progress_percentage = (steps_completed / total_steps) * 100

                            active_sessions.append({
                                "session_id": state_data.get("session_id", ""),
                                "primary_keyword": state_data.get("primary_keyword", ""),
                                "blog_type": state_data.get("blog_type", ""),
                                "status": session_status,
                                "created_at": state_data.get("created_at", ""),
                                "updated_at": state_data.get("updated_at", ""),
                                "expires_at": state_data.get("expires_at", ""),
                                "current_step": state_data.get("current_step", 1),
                                "total_steps": total_steps,
                                "progress_percentage": round(progress_percentage, 1),
                                "steps_completed": steps_completed
                            })
                except Exception as e:
                    logger.error(f"Error reading session {session_dir.name}: {e}")
                    continue

    # Sort by updated_at descending (most recent first)
    active_sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)

    logger.info(f"Found {len(active_sessions)} active/paused sessions")
    return {"sessions": active_sessions}


@router.patch("/{session_id}/status")
async def update_session_status(
    session_id: str,
    status: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update session status (for pause/resume functionality).

    Args:
        session_id: Unique session identifier
        status: New status (active, paused, completed)

    Returns:
        Updated session state

    Raises:
        HTTPException: If session not found or invalid status
    """
    # Validate status
    valid_statuses = ["active", "paused", "completed"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    # URL decode session_id
    session_id = unquote(session_id)

    # Get session path
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"
    session_path = sessions_dir / session_id
    state_file = session_path / "state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    # Load current state
    with open(state_file, 'r') as f:
        state_data = json.load(f)

    # Update status and timestamp
    old_status = state_data.get("status")
    state_data["status"] = status
    state_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Save updated state
    with open(state_file, 'w') as f:
        json.dump(state_data, f, indent=2)

    logger.info(f"Session {session_id} status updated: {old_status} -> {status}")

    return SessionState(**state_data)


# Simple cache for session list (10-second TTL)
_session_cache = {}
_cache_lock = {}

@router.get("/")
async def list_sessions(
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
    current_user: Dict = Depends(get_current_user)
):
    """
    List all blog sessions with pagination (for Creator history view).

    Query Parameters:
        status_filter: Optional filter by session status (active, completed, paused, expired)
        page: Page number (default: 1)
        page_size: Number of sessions per page (default: 5, max: 50)

    Returns:
        Paginated list of sessions with metadata:
        {
            "sessions": [...],
            "pagination": {
                "page": 1,
                "page_size": 5,
                "total_count": 19,
                "total_pages": 4,
                "has_next": true,
                "has_prev": false
            },
            "errors": [
                {"session_id": "...", "error": "..."}
            ]
        }
    """
    # Validate pagination params
    page = max(1, page)
    page_size = min(max(1, page_size), 50)  # Max 50 per page

    logger.info(f"Listing sessions (filter: {status_filter}, page: {page}, page_size: {page_size})")

    # Get sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    if not sessions_dir.exists():
        return {
            "sessions": [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": 0,
                "total_pages": 0,
                "has_next": False,
                "has_prev": False
            },
            "errors": []
        }

    sessions = []
    errors = []

    # Iterate through all session directories
    for session_dir in sessions_dir.iterdir():
        if not session_dir.is_dir():
            continue

        state_file = session_dir / "state.json"
        if not state_file.exists():
            continue

        try:
            state = await read_json_file(state_file)

            # Apply status filter if provided
            if status_filter and state.get("status") != status_filter:
                continue

            # Calculate progress
            steps = state.get("steps", {})
            schema_version = state.get("schema_version", 1)

            # Old sessions (v1): hide steps 21-22, so total is 20
            # New sessions (v2): full 22 steps
            total_steps = 20 if schema_version < 2 else 22

            steps_completed = sum(
                1 for step in steps.values()
                if step.get("status") == "completed"
            )
            steps_skipped = sum(
                1 for step in steps.values()
                if step.get("skipped", False)
            )
            progress_percentage = (steps_completed / total_steps) * 100

            sessions.append({
                "session_id": state.get("session_id", ""),
                "primary_keyword": state.get("primary_keyword", ""),
                "blog_type": state.get("blog_type", ""),
                "status": state.get("status", ""),
                "created_at": state.get("created_at", ""),
                "updated_at": state.get("updated_at", ""),
                "current_step": state.get("current_step", 1),
                "total_steps": total_steps,
                "progress_percentage": round(progress_percentage, 1),
                "steps_completed": steps_completed,
                "steps_skipped": steps_skipped,
                "schema_version": schema_version
            })

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error reading session {session_dir.name}: {error_msg}")
            errors.append({
                "session_id": session_dir.name,
                "error": error_msg
            })
            continue

    # Sort by updated_at (most recent first)
    sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)

    # Calculate pagination
    total_count = len(sessions)
    total_pages = (total_count + page_size - 1) // page_size  # Ceiling division
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    # Get paginated slice
    paginated_sessions = sessions[start_idx:end_idx]

    # Pagination metadata
    pagination = {
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }

    logger.info(f"Returning {len(paginated_sessions)} of {total_count} sessions (page {page}/{total_pages})")
    if errors:
        logger.warning(f"Encountered {len(errors)} errors while reading sessions")

    return {
        "sessions": paginated_sessions,
        "pagination": pagination,
        "errors": errors
    }
