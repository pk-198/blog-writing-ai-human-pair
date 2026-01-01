"""
Webinar Workflow Orchestrator Service.
Coordinates all 15 webinar-to-blog workflow steps, manages state transitions, and handles audit logging.
Independent parallel system to the main blog workflow.
"""

from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
import json
import time

from app.core.config import settings
from app.core.logger import (
    setup_logger,
    log_step_start,
    log_step_complete,
    log_step_skip,
    log_step_error
)
from app.services.openai_service import openai_service
from app.services.tavily_service import tavily_service
from app.utils.file_ops import (
    read_json_file,
    write_json_file,
    append_text_file,
    read_text_file,
    write_text_file
)

logger = setup_logger(__name__)


class WebinarWorkflowService:
    """Central coordinator for webinar-to-blog creation workflow."""

    def __init__(self):
        self.step_names = {
            1: "Webinar Topic Input",
            2: "Competitor Content Fetch",
            3: "Competitor Analysis",
            4: "Webinar Transcript Input",
            5: "Content Guidelines Input",
            6: "Outline Generation",
            7: "LLM Optimization Planning",
            8: "Landing Page Evaluation",
            9: "Infographic Planning",
            10: "Title Generation",
            11: "Blog Draft Generation",
            12: "Meta Description",
            13: "AI Signal Removal",
            14: "Export & Archive",
            15: "Final Review Checklist"
        }

    def _get_session_path(self, session_id: str) -> Path:
        """Get absolute path to webinar session directory."""
        backend_dir = Path(__file__).parent.parent.parent.parent
        return backend_dir / "data" / "webinar_sessions" / session_id

    async def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Load webinar session state from file."""
        session_path = self._get_session_path(session_id)
        state_file = session_path / "state.json"

        if not state_file.exists():
            raise FileNotFoundError(f"Webinar session {session_id} not found")

        return await read_json_file(state_file)

    async def update_session_state(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update webinar session state file."""
        state = await self.get_session_state(session_id)

        # Update fields
        for key, value in updates.items():
            state[key] = value

        # Always update timestamp
        state["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Save back
        session_path = self._get_session_path(session_id)
        await write_json_file(session_path / "state.json", state)

        return state

    async def update_step_data(
        self,
        session_id: str,
        step_number: int,
        data: Dict[str, Any],
        status: str = "completed"
    ) -> Dict[str, Any]:
        """
        Update specific step data and status.

        Args:
            session_id: Webinar session identifier
            step_number: Step number (1-15)
            data: Step-specific data to save
            status: Step status (in_progress, completed, skipped)

        Returns:
            Updated session state
        """
        state = await self.get_session_state(session_id)

        step_key = str(step_number)
        if step_key not in state["steps"]:
            raise ValueError(f"Step {step_number} not found in webinar session")

        # Update step data
        state["steps"][step_key]["data"] = data
        state["steps"][step_key]["status"] = status
        state["steps"][step_key]["updated_at"] = datetime.now(timezone.utc).isoformat()

        if status == "completed":
            state["steps"][step_key]["completed_at"] = datetime.now(timezone.utc).isoformat()

        # Update current step if needed (both completed and skipped steps should advance)
        if status in ["completed", "skipped"] and step_number == state["current_step"]:
            state["current_step"] = min(step_number + 1, 15)

        # Save
        await self.update_session_state(session_id, state)

        return state

    async def add_audit_entry(
        self,
        session_id: str,
        step_number: int,
        summary: str,
        human_action: Optional[str] = None,
        duration_minutes: int = 0,
        skipped: bool = False,
        skip_reason: Optional[str] = None
    ):
        """Add entry to webinar audit log."""
        session_path = self._get_session_path(session_id)
        audit_file = session_path / "audit_log.json"

        # Load existing log
        if audit_file.exists():
            audit_log = await read_json_file(audit_file)
        else:
            audit_log = {
                "session_id": session_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "entries": []
            }

        # Create entry
        entry = {
            "step_number": step_number,
            "step_name": self.step_names.get(step_number, "Unknown"),
            "owner": self._get_step_owner(step_number),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_minutes": duration_minutes,
            "summary": summary,
            "human_action": human_action,
            "data_snapshot": "state.json",
            "skipped": skipped,
            "skip_reason": skip_reason
        }

        audit_log["entries"].append(entry)

        # Save
        await write_json_file(audit_file, audit_log)

    def _get_step_owner(self, step_number: int) -> str:
        """Get step owner type for webinar workflow."""
        ai_steps = {2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14}  # AI-driven steps
        human_steps = {1, 4, 5, 15}  # Human input steps

        if step_number in ai_steps:
            return "AI"
        elif step_number in human_steps:
            return "Human"
        else:
            return "System"

    async def execute_step(
        self,
        session_id: str,
        step_number: int,
        input_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a specific webinar workflow step.

        Args:
            session_id: Webinar session identifier
            step_number: Step to execute (1-15)
            input_data: Input data for the step (if human input step)

        Returns:
            Step execution result
        """
        step_name = self.step_names.get(step_number, "Unknown Step")
        log_step_start(logger, session_id, step_number, step_name)

        start_time = time.time()

        try:
            # Load current state
            state = await self.get_session_state(session_id)

            existing_data = state["steps"].get(str(step_number), {}).get("data", {})

            # Mark step as in_progress
            await self.update_step_data(session_id, step_number, existing_data, "in_progress")

            # Reload state to get latest status
            state = await self.get_session_state(session_id)

            # Import step implementations (lazy import to avoid circular dependencies)
            from app.services.webinar_step_implementations import (
                execute_webinar_step1_topic,
                execute_webinar_step2_competitor_fetch,
                execute_webinar_step3_competitor_analysis,
                execute_webinar_step4_transcript,
                execute_webinar_step5_guidelines,
                execute_webinar_step6_outline,
                execute_webinar_step7_llm_optimization,
                execute_webinar_step8_landing_page,
                execute_webinar_step9_infographic,
                execute_webinar_step10_title,
                execute_webinar_step11_draft,
                execute_webinar_step12_meta,
                execute_webinar_step13_ai_signal,
                execute_webinar_step14_export,
                execute_webinar_step15_review
            )

            # Execute step based on number
            if step_number == 1:
                result = await execute_webinar_step1_topic(self, session_id, state, input_data)
            elif step_number == 2:
                result = await execute_webinar_step2_competitor_fetch(self, session_id, state)
            elif step_number == 3:
                result = await execute_webinar_step3_competitor_analysis(self, session_id, state)
            elif step_number == 4:
                result = await execute_webinar_step4_transcript(self, session_id, state, input_data)
            elif step_number == 5:
                result = await execute_webinar_step5_guidelines(self, session_id, state, input_data)
            elif step_number == 6:
                result = await execute_webinar_step6_outline(self, session_id, state)
            elif step_number == 7:
                result = await execute_webinar_step7_llm_optimization(self, session_id, state)
            elif step_number == 8:
                result = await execute_webinar_step8_landing_page(self, session_id, state)
            elif step_number == 9:
                result = await execute_webinar_step9_infographic(self, session_id, state)
            elif step_number == 10:
                result = await execute_webinar_step10_title(self, session_id, state)
            elif step_number == 11:
                result = await execute_webinar_step11_draft(self, session_id, state)
            elif step_number == 12:
                result = await execute_webinar_step12_meta(self, session_id, state)
            elif step_number == 13:
                result = await execute_webinar_step13_ai_signal(self, session_id, state)
            elif step_number == 14:
                result = await execute_webinar_step14_export(self, session_id, state)
            elif step_number == 15:
                result = await execute_webinar_step15_review(self, session_id, state, input_data)
            else:
                raise ValueError(f"Invalid webinar step number: {step_number}")

            # Update step with result
            await self.update_step_data(session_id, step_number, result, "completed")

            # Calculate duration
            duration = int((time.time() - start_time) / 60)  # Convert to minutes for audit

            # Add audit entry
            await self.add_audit_entry(
                session_id=session_id,
                step_number=step_number,
                summary=f"Completed: {step_name}",
                duration_minutes=duration
            )

            # Log with duration in seconds (logger expects seconds as float)
            log_step_complete(logger, session_id, step_number, time.time() - start_time)

            return {
                "success": True,
                "step_number": step_number,
                "step_name": step_name,
                "data": result,
                "duration_seconds": time.time() - start_time
            }

        except Exception as e:
            log_step_error(logger, session_id, step_number, e)

            # Revert step to pending
            try:
                await self.update_step_data(session_id, step_number, {}, "pending")
            except:
                pass

            return {
                "success": False,
                "step_number": step_number,
                "step_name": step_name,
                "error": str(e),
                "duration_seconds": time.time() - start_time
            }

    async def skip_step(
        self,
        session_id: str,
        step_number: int,
        reason: str
    ) -> Dict[str, Any]:
        """Skip a webinar workflow step with reason."""
        step_name = self.step_names.get(step_number, "Unknown Step")
        log_step_skip(logger, session_id, step_number, reason)

        # Update step as skipped
        await self.update_step_data(
            session_id,
            step_number,
            {"skipped": True, "skip_reason": reason},
            "skipped"
        )

        # Add audit entry
        await self.add_audit_entry(
            session_id=session_id,
            step_number=step_number,
            summary=f"Step skipped by user",
            human_action=None,
            duration_minutes=0,
            skipped=True,
            skip_reason=reason
        )

        return {
            "success": True,
            "step_number": step_number,
            "step_name": step_name,
            "skipped": True,
            "reason": reason
        }


# Global instance
webinar_workflow_service = WebinarWorkflowService()
