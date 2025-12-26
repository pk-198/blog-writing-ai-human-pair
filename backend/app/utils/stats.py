"""
Statistics calculation utilities for dashboard analytics.
Provides functions to aggregate session data and calculate metrics.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
import json

from app.core.logger import setup_logger

logger = setup_logger(__name__)


def calculate_date_range(days: Optional[int] = None) -> Tuple[datetime, datetime]:
    """
    Calculate start and end datetime for a time window.

    Args:
        days: Number of days to look back (10, 30, etc.). None = all time

    Returns:
        Tuple of (start_datetime, end_datetime)
    """
    end_date = datetime.now(timezone.utc)

    if days is None:
        # All time: start from epoch
        start_date = datetime(1970, 1, 1, tzinfo=timezone.utc)
    else:
        start_date = end_date - timedelta(days=days)

    return start_date, end_date


def is_session_in_range(
    session: Dict[str, Any],
    start_date: datetime,
    end_date: datetime,
    date_field: str = "updated_at"
) -> bool:
    """
    Check if session falls within date range.

    Args:
        session: Session state dict
        start_date: Start of date range
        end_date: End of date range
        date_field: Field to check (updated_at, created_at, etc.)

    Returns:
        True if session is in range
    """
    try:
        session_date_str = session.get(date_field)
        if not session_date_str:
            return False

        # Parse ISO datetime string
        session_date = datetime.fromisoformat(session_date_str.replace('Z', '+00:00'))

        return start_date <= session_date <= end_date
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to parse date from session: {e}")
        return False


def is_session_expired(session: Dict[str, Any]) -> bool:
    """
    Check if session has expired (expires_at < now and status != completed).

    Args:
        session: Session state dict

    Returns:
        True if expired
    """
    try:
        expires_at_str = session.get("expires_at")
        status = session.get("status")

        if not expires_at_str or status == "completed":
            return False

        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)

        return expires_at < now
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to check expiry for session: {e}")
        return False


def calculate_session_duration(session: Dict[str, Any]) -> Optional[float]:
    """
    Calculate session duration in hours.

    Args:
        session: Session state dict

    Returns:
        Duration in hours, or None if timestamps missing
    """
    try:
        created_at_str = session.get("created_at")
        updated_at_str = session.get("updated_at")

        if not created_at_str or not updated_at_str:
            return None

        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        updated_at = datetime.fromisoformat(updated_at_str.replace('Z', '+00:00'))

        duration = (updated_at - created_at).total_seconds() / 3600  # Convert to hours
        return round(duration, 2)
    except (ValueError, AttributeError) as e:
        logger.warning(f"Failed to calculate duration for session: {e}")
        return None


def extract_step_data_metric(
    step_data: Optional[Dict[str, Any]],
    metric_name: str,
    default: Any = 0
) -> Any:
    """
    Extract a specific metric from step data.

    Args:
        step_data: Step data dict
        metric_name: Name of metric to extract
        default: Default value if metric not found

    Returns:
        Metric value or default
    """
    if not step_data:
        return default

    return step_data.get(metric_name, default)


def calculate_skip_rate_for_step(
    sessions: List[Dict[str, Any]],
    step_number: int
) -> Dict[str, Any]:
    """
    Calculate skip rate for a specific step across sessions.

    Args:
        sessions: List of session state dicts
        step_number: Step number to analyze (1-22)

    Returns:
        Dict with skip statistics:
        {
            "step_number": int,
            "step_name": str,
            "times_encountered": int,
            "times_skipped": int,
            "skip_rate": float (0-100),
            "skip_reasons": List[str]
        }
    """
    step_key = str(step_number)
    times_encountered = 0
    times_skipped = 0
    skip_reasons = []
    step_name = f"Step {step_number}"

    for session in sessions:
        steps = session.get("steps", {})
        step_info = steps.get(step_key)

        if not step_info:
            continue

        # Count if step was at least started (not just pending)
        status = step_info.get("status", "pending")
        if status != "pending":
            times_encountered += 1

            # Update step name from first encounter
            if step_name.startswith("Step"):
                step_name = step_info.get("step_name", step_name)

        # Check if skipped
        if step_info.get("skipped", False) or status == "skipped":
            times_skipped += 1

            # Collect skip reason
            skip_reason = step_info.get("skip_reason")
            if skip_reason and skip_reason not in skip_reasons:
                skip_reasons.append(skip_reason)

    # Calculate skip rate
    skip_rate = (times_skipped / times_encountered * 100) if times_encountered > 0 else 0.0

    return {
        "step_number": step_number,
        "step_name": step_name,
        "times_encountered": times_encountered,
        "times_skipped": times_skipped,
        "skip_rate": round(skip_rate, 1),
        "skip_reasons": skip_reasons
    }


def calculate_all_skip_rates(
    sessions: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Calculate skip rates for all 22 steps.

    Args:
        sessions: List of session state dicts

    Returns:
        List of skip statistics for each step, sorted by skip_rate descending
    """
    skip_rates = []

    for step_num in range(1, 23):  # Steps 1-22
        skip_stats = calculate_skip_rate_for_step(sessions, step_num)
        skip_rates.append(skip_stats)

    # Sort by skip rate (highest first)
    skip_rates.sort(key=lambda x: x["skip_rate"], reverse=True)

    return skip_rates


def extract_data_collection_metrics(session: Dict[str, Any]) -> Dict[str, int]:
    """
    Extract data collection metrics from a session.

    Args:
        session: Session state dict

    Returns:
        Dict with counts:
        {
            "data_points": int,
            "tools": int,
            "resource_links": int,
            "credibility_elements": int,
            "faqs": int
        }
    """
    steps = session.get("steps", {})

    # Step 9: Data Points
    step9 = steps.get("9", {}).get("data", {})
    data_points = step9.get("total_count", 0)
    if data_points == 0 and "data_points" in step9:
        data_points = len(step9.get("data_points", []))

    # Step 10: Tools
    step10 = steps.get("10", {}).get("data", {})
    tools = step10.get("tool_count", 0)
    if tools == 0 and "tools" in step10:
        tools = len(step10.get("tools", []))

    # Step 11: Resource Links
    step11 = steps.get("11", {}).get("data", {})
    resource_links = 0
    if "resource_links" in step11:
        resource_links = len(step11.get("resource_links", []))

    # Step 12: Credibility Elements (facts + experiences + quotes)
    step12 = steps.get("12", {}).get("data", {})
    facts = len(step12.get("facts", [])) if isinstance(step12.get("facts"), list) else 0
    experiences = len(step12.get("experiences", [])) if isinstance(step12.get("experiences"), list) else 0
    quotes = len(step12.get("quotes", [])) if isinstance(step12.get("quotes"), list) else 0
    credibility_elements = facts + experiences + quotes

    # Step 18: FAQs (only count user-created FAQs, not AI-generated)
    step18 = steps.get("18", {}).get("data", {})
    user_faqs = len(step18.get("user_faqs", [])) if isinstance(step18.get("user_faqs"), list) else 0
    faqs = user_faqs  # Only count human FAQs as requested

    # Step 9: Prompts Copied (copy button clicks)
    step9 = steps.get("9", {}).get("data", {})
    prompts_copied = step9.get("prompts_copied", 0)

    return {
        "data_points": data_points,
        "tools": tools,
        "resource_links": resource_links,
        "credibility_elements": credibility_elements,
        "faqs": faqs,
        "prompts_copied": prompts_copied
    }


def calculate_average_metrics(
    sessions: List[Dict[str, Any]],
    metric_extractor: callable
) -> Dict[str, float]:
    """
    Calculate average metrics across sessions.

    Args:
        sessions: List of session state dicts
        metric_extractor: Function that takes session and returns dict of metrics

    Returns:
        Dict with average values and totals
    """
    if not sessions:
        return {}

    # Collect all metrics
    all_metrics = [metric_extractor(session) for session in sessions]

    # Calculate averages
    result = {}
    for key in all_metrics[0].keys():
        values = [m[key] for m in all_metrics if m.get(key) is not None]

        if values:
            total = sum(values)
            avg = total / len(values)
            result[f"avg_{key}"] = round(avg, 1)
            result[f"total_{key}"] = total
        else:
            result[f"avg_{key}"] = 0.0
            result[f"total_{key}"] = 0

    result["session_count"] = len(sessions)

    return result
