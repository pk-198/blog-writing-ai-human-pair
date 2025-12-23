"""
Reviewer API routes.
Provides read-only access to blog workflows with plagiarism detection.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import json

from app.core.dependencies import get_current_user
from app.services.plagiarism_service import plagiarism_service
from app.utils.file_ops import read_json_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/sessions")
async def list_all_sessions(
    status_filter: Optional[str] = None,
    current_user: Dict = Depends(get_current_user)
):
    """
    List all blog sessions (for Reviewer dashboard).

    Query Parameters:
        status_filter: Optional filter by session status (active, completed, paused, expired)

    Returns:
        List of sessions with metadata:
        [
            {
                "session_id": "...",
                "primary_keyword": "...",
                "blog_type": "...",
                "status": "...",
                "created_at": "...",
                "updated_at": "...",
                "current_step": 15,
                "total_steps": 22,
                "progress_percentage": 68.2,
                "steps_completed": 14,
                "steps_skipped": 1
            }
        ]
    """
    logger.info(f"Reviewer listing all sessions (filter: {status_filter})")

    # Get sessions directory
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    if not sessions_dir.exists():
        return {"sessions": []}

    sessions = []

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
            total_steps = 22
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
                "steps_skipped": steps_skipped
            })

        except Exception as e:
            logger.error(f"Error reading session {session_dir.name}: {e}")
            continue

    # Sort by updated_at (most recent first)
    sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)

    logger.info(f"Returning {len(sessions)} sessions")
    return {"sessions": sessions}


@router.get("/sessions/{session_id}")
async def get_session_workflow(
    session_id: str,
    include_plagiarism: bool = True,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get complete workflow data for a session with plagiarism scores.

    Args:
        session_id: Session identifier
        include_plagiarism: Whether to include plagiarism detection (default: True)

    Returns:
        Complete workflow data:
        {
            "session": {
                "session_id": "...",
                "primary_keyword": "...",
                "blog_type": "...",
                "status": "...",
                "created_at": "...",
                "updated_at": "...",
                "current_step": 15
            },
            "steps": {
                "1": {
                    "step_number": 1,
                    "step_name": "Search Intent Analysis",
                    "owner": "AI",
                    "status": "completed",
                    "started_at": "...",
                    "completed_at": "...",
                    "duration_seconds": 45,
                    "data": {...},
                    "skipped": false,
                    "skip_reason": null,
                    "plagiarism": null  // Only for human input steps
                },
                ...
            },
            "plagiarism_summary": {
                "overall_score": 0.15,
                "overall_level": "unique",
                "overall_color": "green",
                "steps_with_plagiarism": [4, 9],
                "total_matches": 3
            },
            "audit_log": [...]
        }
    """
    logger.info(f"Reviewer accessing session {session_id} (plagiarism: {include_plagiarism})")

    # Get session state
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"
    session_path = sessions_dir / session_id
    state_file = session_path / "state.json"
    audit_file = session_path / "audit_log.json"

    if not state_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )

    state = await read_json_file(state_file)

    # Load audit log
    audit_log = []
    if audit_file.exists():
        audit_data = await read_json_file(audit_file)
        audit_log = audit_data.get("entries", [])

    # Get plagiarism scores if requested
    plagiarism_data = None
    if include_plagiarism:
        try:
            logger.info(f"Running plagiarism check for session {session_id}")
            plagiarism_data = await plagiarism_service.check_plagiarism_for_session(session_id)
        except Exception as e:
            logger.error(f"Plagiarism check failed for {session_id}: {e}")
            # Don't fail the entire request if plagiarism check fails
            plagiarism_data = None

    # Build step-by-step data with plagiarism scores
    step_owners = {
        1: "AI", 2: "AI", 3: "AI", 4: "AI+Human", 5: "Human", 6: "AI",
        7: "AI", 8: "AI", 9: "Human", 10: "Human", 11: "Human",
        12: "Human", 13: "Human", 14: "AI", 15: "AI", 16: "AI",
        17: "AI", 18: "AI", 19: "AI", 20: "AI", 21: "Human", 22: "AI"
    }

    steps_data = {}
    for step_num in range(1, 23):
        step_key = str(step_num)
        step_info = state.get("steps", {}).get(step_key, {})

        # Calculate duration if timestamps available
        duration_seconds = None
        if step_info.get("started_at") and step_info.get("completed_at"):
            try:
                started = datetime.fromisoformat(step_info["started_at"].replace("Z", "+00:00"))
                completed = datetime.fromisoformat(step_info["completed_at"].replace("Z", "+00:00"))
                duration_seconds = int((completed - started).total_seconds())
            except:
                pass

        # Get plagiarism data for this step (if available)
        step_plagiarism = None
        if plagiarism_data and step_key in plagiarism_data.get("steps", {}):
            step_plagiarism = plagiarism_data["steps"][step_key]

        steps_data[step_key] = {
            "step_number": step_num,
            "step_name": step_info.get("step_name", ""),
            "owner": step_owners.get(step_num, "System"),
            "status": step_info.get("status", "pending"),
            "started_at": step_info.get("started_at"),
            "completed_at": step_info.get("completed_at"),
            "duration_seconds": duration_seconds,
            "data": step_info.get("data", {}),
            "human_action": step_info.get("human_action"),
            "skipped": step_info.get("skipped", False),
            "skip_reason": step_info.get("skip_reason"),
            "plagiarism": step_plagiarism
        }

    # Build plagiarism summary
    plagiarism_summary = None
    if plagiarism_data:
        steps_with_plagiarism = [
            int(step_key)
            for step_key, step_plag in plagiarism_data.get("steps", {}).items()
            if step_plag.get("has_plagiarism", False)
        ]
        total_matches = sum(
            len(step_plag.get("matches_from_blogs", []))
            for step_plag in plagiarism_data.get("steps", {}).values()
        )

        plagiarism_summary = {
            "overall_score": plagiarism_data.get("overall_plagiarism_score", 0.0),
            "overall_level": plagiarism_data.get("overall_level", "unique"),
            "overall_color": plagiarism_data.get("overall_color", "green"),
            "steps_with_plagiarism": steps_with_plagiarism,
            "total_matches": total_matches
        }

    response = {
        "session": {
            "session_id": state.get("session_id", ""),
            "primary_keyword": state.get("primary_keyword", ""),
            "blog_type": state.get("blog_type", ""),
            "status": state.get("status", ""),
            "created_at": state.get("created_at", ""),
            "updated_at": state.get("updated_at", ""),
            "expires_at": state.get("expires_at", ""),
            "current_step": state.get("current_step", 1)
        },
        "steps": steps_data,
        "plagiarism_summary": plagiarism_summary,
        "audit_log": audit_log
    }

    logger.info(f"Returning workflow data for session {session_id}")
    return response


@router.get("/sessions/{session_id}/download")
async def download_blog_export(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Download final blog export markdown file.

    Args:
        session_id: Session identifier

    Returns:
        File download response
    """
    from fastapi.responses import FileResponse

    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"
    session_path = sessions_dir / session_id

    # Find most recent export file
    export_files = list(session_path.glob("blog_export_*.md"))

    if not export_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No blog export found for this session"
        )

    # Get most recent file
    latest_export = max(export_files, key=lambda p: p.stat().st_mtime)

    return FileResponse(
        path=str(latest_export),
        filename=latest_export.name,
        media_type="text/markdown"
    )


@router.get("/plagiarism/database")
async def get_plagiarism_database(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get plagiarism database (all stored user inputs from past sessions).

    Returns:
        Plagiarism database with user inputs from all sessions
    """
    logger.info("Reviewer accessing plagiarism database")

    past_sessions = await plagiarism_service.get_all_past_sessions()

    return {
        "total_sessions": len(past_sessions),
        "sessions": past_sessions
    }
