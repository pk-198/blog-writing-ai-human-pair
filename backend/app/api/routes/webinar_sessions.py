"""
Webinar session management routes for webinar-to-blog creation workflow.
Handles session creation, retrieval, and state management for webinar workflow.
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
from app.models.webinar_session import WebinarSessionCreate, WebinarSessionResponse, WebinarSessionState, WebinarStepInfo
from app.utils.file_ops import read_json_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


def generate_webinar_session_id(topic: str) -> str:
    """Generate a unique webinar session ID from topic and timestamp."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    topic_slug = topic.lower().replace(" ", "-")[:30]
    return f"webinar_{timestamp}_{topic_slug}"


def create_webinar_session_directory(session_id: str) -> Path:
    """Create directory structure for a new webinar session."""
    # Get absolute path for webinar_sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "webinar_sessions"

    session_path = sessions_dir / session_id
    session_path.mkdir(parents=True, exist_ok=True)

    # Create subdirectories
    (session_path / "drafts").mkdir(exist_ok=True)

    return session_path


def initialize_webinar_session_state(
    session_id: str,
    webinar_topic: str,
    guest_name: Optional[str] = None,
    guest_credentials: Optional[str] = None,
    target_audience: Optional[str] = None,
    content_format: str = "ghostwritten"
) -> WebinarSessionState:
    """Initialize a new webinar session state with all 15 steps."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.SESSION_EXPIRY_HOURS)

    # Initialize all 15 webinar steps
    steps = {}
    step_names = [
        "Webinar Topic Input",
        "Competitor Content Fetch",
        "Competitor Analysis",
        "Webinar Transcript Input",
        "Content Guidelines Input",
        "Outline Generation",
        "LLM Optimization Planning",
        "Landing Page Evaluation",
        "Infographic Planning",
        "Title Generation",
        "Blog Draft Generation",
        "Meta Description",
        "AI Signal Removal",
        "Export & Archive",
        "Final Review Checklist"
    ]

    for i, step_name in enumerate(step_names, start=1):
        # DESIGN NOTE: Step 1 pre-population to avoid duplicate data entry
        # Webinar topic, guest info, and audience are already collected in the dashboard
        # modal when user clicks "Create Webinar Blog". To prevent asking users to re-enter
        # the same data in Step 1, we pre-populate Step 1 with dashboard form data and mark
        # it as completed. This improves UX by eliminating redundant input steps.
        if i == 1:
            step_data = {
                "webinar_topic": webinar_topic,
                "guest_name": guest_name,
                "guest_credentials": guest_credentials,
                "target_audience": target_audience
            }
            # Mark Step 1 as completed since data was already collected from dashboard
            steps[str(i)] = WebinarStepInfo(
                step_number=i,
                step_name=step_name,
                status="completed",
                data=step_data,
                completed_at=now
            )
        else:
            steps[str(i)] = WebinarStepInfo(
                step_number=i,
                step_name=step_name,
                status="pending"
            )

    return WebinarSessionState(
        session_id=session_id,
        created_at=now,
        updated_at=now,
        expires_at=expires_at,
        current_step=2,  # Start at Step 2 because Step 1 is pre-populated from dashboard (see above)
        status="active",
        webinar_topic=webinar_topic,
        guest_name=guest_name,
        guest_credentials=guest_credentials,
        target_audience=target_audience,
        content_format=content_format,
        schema_version=1,
        steps=steps
    )


@router.post("/", response_model=WebinarSessionResponse)
async def create_webinar_session(
    request: WebinarSessionCreate,
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new webinar-to-blog creation session.

    Args:
        request: Webinar session creation request
        current_user: Authenticated user

    Returns:
        Webinar session response with session ID and initial state
    """
    logger.info(f"Creating webinar session for topic: '{request.webinar_topic}'")

    # Generate session ID
    session_id = generate_webinar_session_id(request.webinar_topic)

    # Create session directory
    session_path = create_webinar_session_directory(session_id)

    # Initialize session state
    session_state = initialize_webinar_session_state(
        session_id=session_id,
        webinar_topic=request.webinar_topic,
        guest_name=request.guest_name,
        guest_credentials=request.guest_credentials,
        target_audience=request.target_audience,
        content_format=request.content_format
    )

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

    logger.info(f"Webinar session created: {session_id}")

    return WebinarSessionResponse(
        session_id=session_id,
        created_at=session_state.created_at,
        current_step=session_state.current_step,
        status=session_state.status,
        webinar_topic=session_state.webinar_topic,
        guest_name=session_state.guest_name,
        guest_credentials=session_state.guest_credentials,
        target_audience=session_state.target_audience,
        content_format=session_state.content_format,
        schema_version=session_state.schema_version
    )


@router.get("/{session_id}", response_model=WebinarSessionState)
async def get_webinar_session(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get webinar session state.

    Args:
        session_id: Webinar session identifier
        current_user: Authenticated user

    Returns:
        Complete webinar session state
    """
    # Decode session ID in case it's URL-encoded
    session_id = unquote(session_id)

    logger.info(f"Fetching webinar session: {session_id}")

    # Get webinar session path
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    session_path = backend_dir / "data" / "webinar_sessions" / session_id
    state_file = session_path / "state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webinar session {session_id} not found"
        )

    # Load state
    state = await read_json_file(state_file)

    return state


@router.put("/{session_id}")
async def update_webinar_session(
    session_id: str,
    updates: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """
    Update webinar session state.

    Args:
        session_id: Webinar session identifier
        updates: Fields to update
        current_user: Authenticated user

    Returns:
        Updated session state
    """
    session_id = unquote(session_id)

    logger.info(f"Updating webinar session: {session_id}")

    # Get session path
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    session_path = backend_dir / "data" / "webinar_sessions" / session_id
    state_file = session_path / "state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webinar session {session_id} not found"
        )

    # Load current state
    state = await read_json_file(state_file)

    # Apply updates
    for key, value in updates.items():
        if key in state:
            state[key] = value

    # Update timestamp
    state["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Save
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2, default=str)

    logger.info(f"Webinar session updated: {session_id}")

    return state


@router.delete("/{session_id}/pause")
async def pause_webinar_session(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Pause webinar session (set status to 'paused').

    Args:
        session_id: Webinar session identifier
        current_user: Authenticated user

    Returns:
        Success message
    """
    session_id = unquote(session_id)

    logger.info(f"Pausing webinar session: {session_id}")

    # Get session path
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    session_path = backend_dir / "data" / "webinar_sessions" / session_id
    state_file = session_path / "state.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Webinar session {session_id} not found"
        )

    # Load state
    state = await read_json_file(state_file)

    # Update status
    state["status"] = "paused"
    state["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Save
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2, default=str)

    logger.info(f"Webinar session paused: {session_id}")

    return {"message": "Webinar session paused successfully", "session_id": session_id}


@router.get("/")
async def list_webinar_sessions_root(
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
    current_user: Dict = Depends(get_current_user)
):
    """
    List all webinar sessions with pagination (for Creator history view).

    NOTE: This must come BEFORE /{session_id} route to avoid conflicts.

    Query Parameters:
        status_filter: Optional filter by session status (active, completed, paused, expired)
        page: Page number (default: 1)
        page_size: Number of sessions per page (default: 5, max: 50)

    Returns:
        Paginated list of webinar sessions with metadata
    """
    return await list_webinar_sessions(status_filter, page, page_size, current_user)


@router.get("/active/list")
async def list_active_webinar_sessions(current_user: Dict = Depends(get_current_user)):
    """
    Get all currently active or paused webinar sessions (multi-session support).

    Returns:
        List of active/paused webinar sessions sorted by updated_at (most recent first)
    """
    # Get absolute path for webinar_sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "webinar_sessions"

    if not sessions_dir.exists():
        return {"sessions": []}

    # Find all active or paused webinar sessions
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
                            total_steps = 15  # Webinar workflow has 15 steps

                            steps_completed = sum(
                                1 for step in steps.values()
                                if step.get("status") == "completed"
                            )
                            progress_percentage = (steps_completed / total_steps) * 100

                            active_sessions.append({
                                "session_id": state_data.get("session_id", ""),
                                "webinar_topic": state_data.get("webinar_topic", ""),
                                "guest_name": state_data.get("guest_name"),
                                "status": session_status,
                                "created_at": state_data.get("created_at", ""),
                                "updated_at": state_data.get("updated_at", ""),
                                "expires_at": state_data.get("expires_at", ""),
                                "current_step": state_data.get("current_step", 1),
                                "total_steps": total_steps,
                                "progress_percentage": round(progress_percentage, 1),
                                "steps_completed": steps_completed,
                                "session_type": "webinar"  # Mark as webinar session
                            })
                except Exception as e:
                    logger.error(f"Error reading webinar session {session_dir.name}: {e}")
                    continue

    # Sort by updated_at descending (most recent first)
    active_sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)

    logger.info(f"Found {len(active_sessions)} active/paused webinar sessions")
    return {"sessions": active_sessions}


async def list_webinar_sessions(
    status_filter: Optional[str],
    page: int,
    page_size: int,
    current_user: Dict
):
    """
    List all webinar sessions with pagination (for Creator history view).

    Query Parameters:
        status_filter: Optional filter by session status (active, completed, paused, expired)
        page: Page number (default: 1)
        page_size: Number of sessions per page (default: 5, max: 50)

    Returns:
        Paginated list of webinar sessions with metadata:
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

    logger.info(f"Listing webinar sessions (filter: {status_filter}, page: {page}, page_size: {page_size})")

    # Get webinar sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "webinar_sessions"

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

    # Iterate through all webinar session directories
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
            total_steps = 15  # Webinar workflow has 15 steps

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
                "webinar_topic": state.get("webinar_topic", ""),
                "guest_name": state.get("guest_name"),
                "content_format": state.get("content_format", "ghostwritten"),
                "status": state.get("status", ""),
                "created_at": state.get("created_at", ""),
                "updated_at": state.get("updated_at", ""),
                "current_step": state.get("current_step", 1),
                "total_steps": total_steps,
                "progress_percentage": round(progress_percentage, 1),
                "steps_completed": steps_completed,
                "steps_skipped": steps_skipped,
                "schema_version": state.get("schema_version", 1),
                "session_type": "webinar"  # Mark as webinar session for frontend
            })

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error reading webinar session {session_dir.name}: {error_msg}")
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

    logger.info(f"Returning {len(paginated_sessions)} of {total_count} webinar sessions (page {page}/{total_pages})")
    if errors:
        logger.warning(f"Encountered {len(errors)} errors while reading webinar sessions")

    return {
        "sessions": paginated_sessions,
        "pagination": pagination,
        "errors": errors
    }
