"""
Statistics API routes for dashboard analytics.
Provides aggregated metrics for Creator and Reviewer dashboards.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Dict, List, Optional
from pathlib import Path
import json

from app.core.dependencies import get_current_user
from app.utils.stats import (
    calculate_date_range,
    is_session_in_range,
    is_session_expired,
    calculate_session_duration,
    calculate_all_skip_rates,
    extract_data_collection_metrics,
    calculate_average_metrics
)
from app.core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter()


def load_all_sessions() -> List[Dict]:
    """Load all session state files from disk."""
    backend_dir = Path(__file__).parent.parent.parent.parent.parent
    sessions_dir = backend_dir / "data" / "sessions"

    if not sessions_dir.exists():
        return []

    sessions = []
    for session_dir in sessions_dir.iterdir():
        if not session_dir.is_dir():
            continue

        state_file = session_dir / "state.json"
        if not state_file.exists():
            continue

        try:
            with open(state_file, 'r') as f:
                session_data = json.load(f)
                sessions.append(session_data)
        except Exception as e:
            logger.error(f"Failed to load session {session_dir.name}: {e}")
            continue

    return sessions


@router.get("/creator")
async def get_creator_stats(
    time_window: Optional[str] = Query(None, regex="^(10d|30d|all)$"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get statistics for Creator dashboard.

    Query Parameters:
        time_window: Time window filter (10d, 30d, all). Default: all

    Returns:
        {
            "time_window": str,
            "productivity": {
                "completed_10d": int,
                "completed_30d": int,
                "total_sessions": int,
                "completion_rate": float
            },
            "active_work": {
                "active_sessions": int,
                "paused_sessions": int,
                "expired_sessions": int,
                "avg_progress": float
            },
            "efficiency": {
                "avg_completion_time_hours": float,
                "fastest_completion_hours": float,
                "slowest_completion_hours": float,
                "top_skipped_steps": [
                    {
                        "step_number": int,
                        "step_name": str,
                        "skip_rate": float,
                        "times_skipped": int
                    }
                ]
            },
            "trends": {
                "completion_rate_10d": float,
                "completion_rate_30d": float,
                "trend": str  # "improving", "declining", "stable"
            }
        }
    """
    logger.info(f"Calculating creator stats (time_window={time_window})")

    # Load all sessions
    all_sessions = load_all_sessions()

    if not all_sessions:
        return {
            "time_window": time_window or "all",
            "productivity": {
                "completed_10d": 0,
                "completed_30d": 0,
                "total_sessions": 0,
                "completion_rate": 0.0
            },
            "active_work": {
                "active_sessions": 0,
                "paused_sessions": 0,
                "expired_sessions": 0,
                "avg_progress": 0.0
            },
            "efficiency": {
                "avg_completion_time_hours": 0.0,
                "fastest_completion_hours": 0.0,
                "slowest_completion_hours": 0.0,
                "top_skipped_steps": []
            },
            "trends": {
                "completion_rate_10d": 0.0,
                "completion_rate_30d": 0.0,
                "trend": "stable"
            }
        }

    # Calculate date ranges
    start_10d, end_date = calculate_date_range(10)
    start_30d, _ = calculate_date_range(30)

    # PRODUCTIVITY METRICS
    completed_sessions = [s for s in all_sessions if s.get("status") == "completed"]

    completed_10d = sum(
        1 for s in completed_sessions
        if is_session_in_range(s, start_10d, end_date, "updated_at")
    )

    completed_30d = sum(
        1 for s in completed_sessions
        if is_session_in_range(s, start_30d, end_date, "updated_at")
    )

    total_sessions = len(all_sessions)
    completion_rate = (len(completed_sessions) / total_sessions * 100) if total_sessions > 0 else 0.0

    # ACTIVE WORK METRICS
    active_sessions = sum(1 for s in all_sessions if s.get("status") == "active")
    paused_sessions = sum(1 for s in all_sessions if s.get("status") == "paused")
    expired_sessions = sum(1 for s in all_sessions if is_session_expired(s))

    # Calculate average progress for active/paused sessions
    active_paused = [s for s in all_sessions if s.get("status") in ["active", "paused"]]
    if active_paused:
        total_progress = 0
        for session in active_paused:
            steps = session.get("steps", {})
            schema_version = session.get("schema_version", 1)
            total_steps = 20 if schema_version < 2 else 22

            steps_completed = sum(
                1 for step in steps.values()
                if step.get("status") == "completed"
            )
            progress = (steps_completed / total_steps) * 100
            total_progress += progress

        avg_progress = round(total_progress / len(active_paused), 1)
    else:
        avg_progress = 0.0

    # EFFICIENCY METRICS
    # Calculate completion times
    completion_times = []
    for session in completed_sessions:
        duration = calculate_session_duration(session)
        if duration is not None:
            completion_times.append(duration)

    avg_completion_time = round(sum(completion_times) / len(completion_times), 1) if completion_times else 0.0
    fastest_completion = round(min(completion_times), 1) if completion_times else 0.0
    slowest_completion = round(max(completion_times), 1) if completion_times else 0.0

    # Calculate skip rates (filter by time window if specified)
    if time_window == "10d":
        sessions_for_skip = [s for s in all_sessions if is_session_in_range(s, start_10d, end_date)]
    elif time_window == "30d":
        sessions_for_skip = [s for s in all_sessions if is_session_in_range(s, start_30d, end_date)]
    else:
        sessions_for_skip = all_sessions

    skip_rates = calculate_all_skip_rates(sessions_for_skip)
    top_skipped_steps = [
        {
            "step_number": sr["step_number"],
            "step_name": sr["step_name"],
            "skip_rate": sr["skip_rate"],
            "times_skipped": sr["times_skipped"],
            "times_encountered": sr["times_encountered"]
        }
        for sr in skip_rates[:3]  # Top 3 most skipped
        if sr["times_encountered"] > 0  # Only include steps that were encountered
    ]

    # TREND ANALYSIS
    sessions_10d = [s for s in all_sessions if is_session_in_range(s, start_10d, end_date, "created_at")]
    sessions_30d = [s for s in all_sessions if is_session_in_range(s, start_30d, end_date, "created_at")]

    completed_in_10d = sum(1 for s in sessions_10d if s.get("status") == "completed")
    completed_in_30d = sum(1 for s in sessions_30d if s.get("status") == "completed")

    completion_rate_10d = (completed_in_10d / len(sessions_10d) * 100) if sessions_10d else 0.0
    completion_rate_30d = (completed_in_30d / len(sessions_30d) * 100) if sessions_30d else 0.0

    # Determine trend
    if completion_rate_10d > completion_rate_30d + 5:
        trend = "improving"
    elif completion_rate_10d < completion_rate_30d - 5:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "time_window": time_window or "all",
        "productivity": {
            "completed_10d": completed_10d,
            "completed_30d": completed_30d,
            "total_sessions": total_sessions,
            "completion_rate": round(completion_rate, 1)
        },
        "active_work": {
            "active_sessions": active_sessions,
            "paused_sessions": paused_sessions,
            "expired_sessions": expired_sessions,
            "avg_progress": avg_progress
        },
        "efficiency": {
            "avg_completion_time_hours": avg_completion_time,
            "fastest_completion_hours": fastest_completion,
            "slowest_completion_hours": slowest_completion,
            "top_skipped_steps": top_skipped_steps
        },
        "trends": {
            "completion_rate_10d": round(completion_rate_10d, 1),
            "completion_rate_30d": round(completion_rate_30d, 1),
            "trend": trend
        }
    }


@router.get("/reviewer")
async def get_reviewer_stats(
    time_window: Optional[str] = Query(None, regex="^(10d|30d|all)$"),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get statistics for Reviewer dashboard (audit and quality metrics).

    Query Parameters:
        time_window: Time window filter (10d, 30d, all). Default: 30d

    Returns:
        {
            "time_window": str,
            "data_collection": {
                "avg_data_points": float,
                "total_data_points": int,
                "avg_tools": float,
                "total_tools": int,
                "avg_resource_links": float,
                "total_resource_links": int,
                "avg_credibility_elements": float,
                "total_credibility_elements": int,
                "avg_faqs": float,
                "total_faqs": int,
                "session_count": int
            },
            "time_metrics": {
                "avg_session_duration_hours": float,
                "avg_completion_time_hours": float,
                "fastest_completion_hours": float,
                "slowest_completion_hours": float,
                "completed_count": int
            },
            "quality_indicators": {
                "overall_skip_rate": float,
                "total_steps_encountered": int,
                "total_steps_skipped": int,
                "skip_by_step": [
                    {
                        "step_number": int,
                        "step_name": str,
                        "times_encountered": int,
                        "times_skipped": int,
                        "skip_rate": float,
                        "skip_reasons": [str]
                    }
                ],
                "most_skipped_step": {
                    "step_number": int,
                    "step_name": str,
                    "times_skipped": int
                }
            }
        }
    """
    logger.info(f"Calculating reviewer stats (time_window={time_window})")

    # Default to 30d if not specified
    if not time_window:
        time_window = "30d"

    # Load all sessions
    all_sessions = load_all_sessions()

    if not all_sessions:
        return {
            "time_window": time_window,
            "productivity": {
                "completed_10d": 0,
                "completed_30d": 0,
                "total_sessions": 0
            },
            "data_collection": {
                "avg_data_points": 0.0,
                "total_data_points": 0,
                "avg_tools": 0.0,
                "total_tools": 0,
                "avg_resource_links": 0.0,
                "total_resource_links": 0,
                "avg_credibility_elements": 0.0,
                "total_credibility_elements": 0,
                "avg_faqs": 0.0,
                "total_faqs": 0,
                "avg_prompts_copied": 0.0,
                "total_prompts_copied": 0,
                "session_count": 0
            },
            "time_metrics": {
                "avg_session_duration_hours": 0.0,
                "avg_completion_time_hours": 0.0,
                "fastest_completion_hours": 0.0,
                "slowest_completion_hours": 0.0,
                "completed_count": 0
            },
            "quality_indicators": {
                "overall_skip_rate": 0.0,
                "total_steps_encountered": 0,
                "total_steps_skipped": 0,
                "skip_by_step": [],
                "most_skipped_step": None
            }
        }

    # Calculate date ranges for productivity metrics
    start_10d, end_date = calculate_date_range(10)
    start_30d, _ = calculate_date_range(30)

    # Filter sessions by time window
    if time_window == "10d":
        start_date, end_date = calculate_date_range(10)
        filtered_sessions = [
            s for s in all_sessions
            if is_session_in_range(s, start_date, end_date, "updated_at")
        ]
    elif time_window == "30d":
        start_date, end_date = calculate_date_range(30)
        filtered_sessions = [
            s for s in all_sessions
            if is_session_in_range(s, start_date, end_date, "updated_at")
        ]
    else:
        filtered_sessions = all_sessions

    # Only analyze completed sessions for data collection metrics
    completed_sessions = [s for s in filtered_sessions if s.get("status") == "completed"]

    # PRODUCTIVITY METRICS (same as creator dashboard)
    all_completed_sessions = [s for s in all_sessions if s.get("status") == "completed"]

    completed_10d = sum(
        1 for s in all_completed_sessions
        if is_session_in_range(s, start_10d, end_date, "updated_at")
    )

    completed_30d = sum(
        1 for s in all_completed_sessions
        if is_session_in_range(s, start_30d, end_date, "updated_at")
    )

    # DATA COLLECTION METRICS
    data_collection = calculate_average_metrics(
        completed_sessions,
        extract_data_collection_metrics
    )

    # TIME METRICS
    # Average duration for all sessions (completed or not)
    durations = []
    for session in filtered_sessions:
        duration = calculate_session_duration(session)
        if duration is not None:
            durations.append(duration)

    avg_session_duration = round(sum(durations) / len(durations), 1) if durations else 0.0

    # Completion time only for completed sessions
    completion_times = []
    for session in completed_sessions:
        duration = calculate_session_duration(session)
        if duration is not None:
            completion_times.append(duration)

    avg_completion_time = round(sum(completion_times) / len(completion_times), 1) if completion_times else 0.0
    fastest_completion = round(min(completion_times), 1) if completion_times else 0.0
    slowest_completion = round(max(completion_times), 1) if completion_times else 0.0

    # QUALITY INDICATORS
    skip_rates = calculate_all_skip_rates(filtered_sessions)

    # Calculate overall skip rate
    total_encountered = sum(sr["times_encountered"] for sr in skip_rates)
    total_skipped = sum(sr["times_skipped"] for sr in skip_rates)
    overall_skip_rate = (total_skipped / total_encountered * 100) if total_encountered > 0 else 0.0

    # Find most skipped step (by absolute count, not rate)
    most_skipped = max(skip_rates, key=lambda x: x["times_skipped"]) if skip_rates else None
    most_skipped_step = {
        "step_number": most_skipped["step_number"],
        "step_name": most_skipped["step_name"],
        "times_skipped": most_skipped["times_skipped"]
    } if most_skipped and most_skipped["times_skipped"] > 0 else None

    return {
        "time_window": time_window,
        "productivity": {
            "completed_10d": completed_10d,
            "completed_30d": completed_30d,
            "total_sessions": len(all_sessions)
        },
        "data_collection": data_collection,
        "time_metrics": {
            "avg_session_duration_hours": avg_session_duration,
            "avg_completion_time_hours": avg_completion_time,
            "fastest_completion_hours": fastest_completion,
            "slowest_completion_hours": slowest_completion,
            "completed_count": len(completed_sessions)
        },
        "quality_indicators": {
            "overall_skip_rate": round(overall_skip_rate, 1),
            "total_steps_encountered": total_encountered,
            "total_steps_skipped": total_skipped,
            "skip_by_step": skip_rates,
            "most_skipped_step": most_skipped_step
        }
    }
