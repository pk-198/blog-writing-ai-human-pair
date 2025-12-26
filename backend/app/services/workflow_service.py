"""
Central Workflow Orchestrator Service.
Coordinates all 22 steps, manages state transitions, and handles audit logging.
Minimal changes approach - adds orchestration layer on top of existing code.
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
    read_text_file
)
# Import all step implementations
from app.services.step_implementations import (
    execute_step1_search_intent,
    execute_step2_competitor_fetch,
    execute_step3_competitor_analysis,
    execute_step4_webinar_points,
    execute_step5_secondary_keywords,
    execute_step6_blog_clustering,
    execute_step7_outline_generation,
    execute_step8_llm_optimization,
    execute_step9_data_collection,
    execute_step10_tools_research,
    execute_step11_resource_links,
    execute_step12_credibility_elements,
    execute_step13_business_info_update,
    execute_step14_landing_page_eval,
    execute_step15_infographic_planning,
    execute_step16_title_creation,
    execute_step17_blog_draft,
    execute_step18_faq_accordion,
    execute_step19_meta_description,
    execute_step20_ai_signal_removal,
    execute_step21_export_archive,
    execute_step22_final_review
)

logger = setup_logger(__name__)


class WorkflowService:
    """Central coordinator for blog creation workflow."""

    def __init__(self):
        self.step_names = {
            1: "Search Intent Analysis",
            2: "Competitor Content Fetch",
            3: "Competitor Analysis",
            4: "Expert Opinion/ QnA / Webinar/Podcast Points",
            5: "Secondary Keywords",
            6: "Blog Clustering",
            7: "Outline Generation",
            8: "LLM Optimization Planning",
            9: "Data Collection",
            10: "Tools Research",
            11: "Resource Links",
            12: "Credibility Elements",
            13: "Business Info Update",
            14: "Landing Page Evaluation",
            15: "Infographic Planning",
            16: "Title Creation",
            17: "Blog Draft Generation",
            18: "FAQ Accordion",
            19: "Meta Description",
            20: "AI Signal Removal",
            21: "Export & Archive",
            22: "Final Review Checklist"
        }

    def _get_session_path(self, session_id: str) -> Path:
        """Get absolute path to session directory."""
        backend_dir = Path(__file__).parent.parent.parent.parent
        return backend_dir / "data" / "sessions" / session_id

    async def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Load session state from file."""
        session_path = self._get_session_path(session_id)
        state_file = session_path / "state.json"

        if not state_file.exists():
            raise FileNotFoundError(f"Session {session_id} not found")

        return await read_json_file(state_file)

    async def update_session_state(
        self,
        session_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update session state file."""
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
            session_id: Session identifier
            step_number: Step number (1-22)
            data: Step-specific data to save
            status: Step status (in_progress, completed, skipped)

        Returns:
            Updated session state
        """
        state = await self.get_session_state(session_id)

        step_key = str(step_number)
        if step_key not in state["steps"]:
            raise ValueError(f"Step {step_number} not found in session")

        # Update step data
        state["steps"][step_key]["data"] = data
        state["steps"][step_key]["status"] = status
        state["steps"][step_key]["updated_at"] = datetime.now(timezone.utc).isoformat()

        if status == "completed":
            state["steps"][step_key]["completed_at"] = datetime.now(timezone.utc).isoformat()

        # Update current step if needed (both completed and skipped steps should advance)
        if status in ["completed", "skipped"] and step_number == state["current_step"]:
            state["current_step"] = min(step_number + 1, 22)

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
        """Add entry to audit log."""
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
        """Get step owner type."""
        ai_steps = {1, 2, 3, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20, 21}  # 21=Export & Archive (AI)
        human_steps = {5, 9, 10, 11, 12, 13, 22}  # 22=Final Review Checklist (Human)
        mixed_steps = {4}  # Webinar points

        if step_number in ai_steps:
            return "AI"
        elif step_number in human_steps:
            return "Human"
        elif step_number in mixed_steps:
            return "AI+Human"
        else:
            return "System"

    async def execute_step(
        self,
        session_id: str,
        step_number: int,
        input_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a specific workflow step.

        Args:
            session_id: Session identifier
            step_number: Step to execute (1-22)
            input_data: Input data for the step (if human input step)

        Returns:
            Step execution result
        """
        step_name = self.step_names.get(step_number, "Unknown Step")
        log_step_start(logger, session_id, step_number, step_name)

        start_time = time.time()

        try:
            # Load current state to preserve existing data (important for multi-phase steps like Step 4)
            state = await self.get_session_state(session_id)

            # Check if Step 22 is being executed on a completed session (Step 22 is view-only after completion)
            if step_number == 22 and state.get("status") == "completed":
                logger.warning(f"[Step 22] Attempted to execute Step 22 on completed session {session_id}")
                raise ValueError("Step 22 (Final Review Checklist) cannot be executed on a completed session. It is view-only after Step 21 completion.")

            # Check if old session (schema v1) is trying to execute new Steps 21-22
            schema_version = state.get("schema_version", 1)
            if schema_version < 2 and step_number in [21, 22]:
                logger.warning(f"[Step {step_number}] Old session (schema v{schema_version}) attempted to execute Step {step_number}")
                raise ValueError(
                    f"Step {step_number} is not available for sessions created before the schema v2 update. "
                    f"This session uses schema v{schema_version}. Workflow for this session ends at Step 20."
                )

            existing_data = state["steps"].get(str(step_number), {}).get("data", {})

            # Mark step as in_progress (preserve existing data to avoid data loss)
            await self.update_step_data(session_id, step_number, existing_data, "in_progress")

            # Reload state to get latest status
            state = await self.get_session_state(session_id)

            # Execute step based on number
            if step_number == 1:
                result = await execute_step1_search_intent(self, session_id, state)
            elif step_number == 2:
                result = await execute_step2_competitor_fetch(self, session_id, state)
            elif step_number == 3:
                result = await execute_step3_competitor_analysis(self, session_id, state)
            elif step_number == 4:
                result = await execute_step4_webinar_points(self, session_id, state, input_data)
            elif step_number == 5:
                result = await execute_step5_secondary_keywords(self, session_id, state, input_data)
            elif step_number == 6:
                result = await execute_step6_blog_clustering(self, session_id, state)
            elif step_number == 7:
                result = await execute_step7_outline_generation(self, session_id, state)
            elif step_number == 8:
                result = await execute_step8_llm_optimization(self, session_id, state)
            elif step_number == 9:
                result = await execute_step9_data_collection(self, session_id, state, input_data)
            elif step_number == 10:
                result = await execute_step10_tools_research(self, session_id, state, input_data)
            elif step_number == 11:
                result = await execute_step11_resource_links(self, session_id, state, input_data)
            elif step_number == 12:
                result = await execute_step12_credibility_elements(self, session_id, state, input_data)
            elif step_number == 13:
                result = await execute_step13_business_info_update(self, session_id, state, input_data)
            elif step_number == 14:
                result = await execute_step14_landing_page_eval(self, session_id, state)
            elif step_number == 15:
                result = await execute_step15_infographic_planning(self, session_id, state)
            elif step_number == 16:
                result = await execute_step16_title_creation(self, session_id, state)
            elif step_number == 17:
                result = await execute_step17_blog_draft(self, session_id, state)
            elif step_number == 18:
                result = await execute_step18_faq_accordion(self, session_id, state, input_data)
            elif step_number == 19:
                result = await execute_step19_meta_description(self, session_id, state)
            elif step_number == 20:
                result = await execute_step20_ai_signal_removal(self, session_id, state)
            elif step_number == 21:
                result = await execute_step21_export_archive(self, session_id, state)
            elif step_number == 22:
                result = await execute_step22_final_review(self, session_id, state, input_data)
            else:
                raise ValueError(f"Invalid step number: {step_number}")

            # Calculate duration
            duration = time.time() - start_time

            # Check if step returned auto-skip response (Steps 2-3 can auto-skip when no competitors)
            if result.get("skipped"):
                # Mark as skipped instead of completed
                await self.update_step_data(session_id, step_number, result, "skipped")

                # Log skip
                log_step_skip(logger, session_id, step_number, result.get("reason", "Auto-skipped"))

                # Add skip audit entry
                await self.add_audit_entry(
                    session_id,
                    step_number,
                    result.get("summary", f"Skipped {step_name}"),
                    result.get("human_action"),
                    int(duration / 60),
                    skipped=True,
                    skip_reason=result.get("reason", "Auto-skipped")
                )
            else:
                # Normal completion
                await self.update_step_data(session_id, step_number, result, "completed")

                # Log completion
                log_step_complete(logger, session_id, step_number, duration)

                # Add audit entry
                await self.add_audit_entry(
                    session_id,
                    step_number,
                    result.get("summary", f"Completed {step_name}"),
                    result.get("human_action"),
                    int(duration / 60)
                )

            return {
                "success": True,
                "step_number": step_number,
                "step_name": step_name,
                "data": result,
                "duration_seconds": duration
            }

        except Exception as e:
            log_step_error(logger, session_id, step_number, e)
            await self.update_step_data(session_id, step_number, {"error": str(e)}, "error")

            return {
                "success": False,
                "step_number": step_number,
                "step_name": step_name,
                "error": str(e)
            }

    async def skip_step(
        self,
        session_id: str,
        step_number: int,
        reason: str
    ) -> Dict[str, Any]:
        """Skip a step with reason."""
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
            session_id,
            step_number,
            f"Step skipped by user",
            None,
            0,
            True,
            reason
        )

        return {
            "success": True,
            "step_number": step_number,
            "step_name": step_name,
            "skipped": True,
            "reason": reason
        }

    # Individual step implementations continue in next chunk...
    # Due to length, I'll create step implementations in a separate method file

    async def _load_past_blogs(self) -> List[str]:
        """Load past blog titles from index."""
        backend_dir = Path(__file__).parent.parent.parent.parent
        blog_index = backend_dir / "data" / "past_blogs" / "blog_index.txt"

        if not blog_index.exists():
            return []

        content = await read_text_file(blog_index)
        lines = content.strip().split('\n')

        # Skip header and empty lines
        titles = [line.strip() for line in lines if line.strip() and not line.startswith('#')]
        return titles

    async def _load_business_context(self) -> str:
        """Load business context from dograh.txt."""
        backend_dir = Path(__file__).parent.parent.parent.parent
        business_file = backend_dir / "data" / "business_info" / "dograh.txt"

        if not business_file.exists():
            return "Dograh - AI-Human Blog Creation System"

        return await read_text_file(business_file)

    async def add_manual_competitors(
        self,
        session_id: str,
        manual_competitors: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Add manually entered competitor content to Step 2 data.
        Processes, validates, and merges with existing auto-fetched competitors.

        Args:
            session_id: Session identifier
            manual_competitors: List of manual competitor entries with {url, title, content}

        Returns:
            Updated Step 2 data with merged competitors

        Raises:
            ValueError: If session not found or Step 2 not executed
        """
        # Load session state
        session_dir = self._get_session_path(session_id)
        state_file = session_dir / "state.json"

        if not state_file.exists():
            raise ValueError(f"Session {session_id} not found")

        state = await read_json_file(state_file)

        # Verify Step 2 has been executed
        if state.get("current_step", 0) < 2:
            raise ValueError("Step 2 must be executed before adding manual competitors")

        step2_data = state.get("steps", {}).get("2", {}).get("data", {})

        if not step2_data:
            raise ValueError("Step 2 data not found. Execute Step 2 first.")

        # Get existing competitors
        existing_competitors = step2_data.get("competitors", [])
        next_rank = len(existing_competitors) + 1

        # Process manual competitors
        processed_manual = []
        competitor_content_dir = session_dir / "competitor_content"
        competitor_content_dir.mkdir(exist_ok=True)

        for manual_entry in manual_competitors:
            # Extract domain from URL
            from urllib.parse import urlparse
            parsed_url = urlparse(manual_entry["url"])
            domain = parsed_url.netloc or parsed_url.path

            # Calculate word count
            word_count = len(manual_entry["content"].split())

            # Build competitor object matching Tavily format
            competitor = {
                "url": manual_entry["url"],
                "title": manual_entry["title"],
                "content": manual_entry["content"],
                "domain": domain,
                "word_count": word_count,
                "rank": next_rank,
                "source": "manual"  # Mark as manually added
            }

            processed_manual.append(competitor)

            # Save individual competitor file with manual prefix to avoid collisions
            # Format: competitor_{rank}_manual_{domain}.txt
            safe_domain = domain.replace('/', '_').replace(':', '_')[:50]  # Sanitize and limit length
            competitor_file = competitor_content_dir / f"competitor_{next_rank}_manual_{safe_domain}.txt"
            await write_text_file(
                competitor_file,
                f"URL: {competitor['url']}\n"
                f"Title: {competitor['title']}\n"
                f"Domain: {competitor['domain']}\n"
                f"Word Count: {competitor['word_count']}\n"
                f"Source: manual\n"
                f"Rank: {competitor['rank']}\n\n"
                f"{competitor['content']}"
            )

            next_rank += 1

        # Merge with existing competitors
        merged_competitors = existing_competitors + processed_manual

        # Update Step 2 data
        step2_data["competitors"] = merged_competitors
        step2_data["count"] = len(merged_competitors)
        # Increment manual additions counter from existing value
        existing_manual = step2_data.get("manual_additions", 0)
        step2_data["manual_additions"] = existing_manual + len(processed_manual)

        # Update session state
        state["steps"]["2"]["data"] = step2_data
        await write_json_file(state_file, state)

        return step2_data


# Singleton instance
workflow_service = WorkflowService()
