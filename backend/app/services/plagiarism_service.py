"""
Plagiarism checking service.
Extracts user inputs from sessions and compares them using n-gram similarity.
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import json
from datetime import datetime

from app.utils.plagiarism import check_step_plagiarism, get_plagiarism_level, get_plagiarism_color
from app.utils.file_ops import read_json_file, write_json_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)


class PlagiarismService:
    """Service for plagiarism detection across blog sessions."""

    def __init__(self):
        self.user_input_steps = [4, 5, 9, 10, 11, 12, 22]  # Human input steps
        backend_dir = Path(__file__).parent.parent.parent.parent
        self.data_dir = backend_dir / "data"
        self.sessions_dir = self.data_dir / "sessions"
        self.plagiarism_db_file = self.data_dir / "plagiarism_check" / "user_inputs.json"

    async def extract_user_inputs_from_session(self, session_id: str) -> Dict[str, Any]:
        """
        Extract user inputs from a specific session.

        Args:
            session_id: Session identifier

        Returns:
            Dictionary with extracted user inputs per step
        """
        session_path = self.sessions_dir / session_id
        state_file = session_path / "state.json"

        if not state_file.exists():
            raise FileNotFoundError(f"Session {session_id} not found")

        state = await read_json_file(state_file)

        user_inputs = {
            "session_id": session_id,
            "primary_keyword": state.get("primary_keyword", ""),
            "blog_type": state.get("blog_type", ""),
            "created_at": state.get("created_at", ""),
            "steps": {}
        }

        # Extract data from human input steps
        for step_num in self.user_input_steps:
            step_key = str(step_num)
            step_data = state.get("steps", {}).get(step_key, {}).get("data", {})

            if step_data and not step_data.get("skipped", False):
                user_inputs["steps"][step_key] = self._extract_step_user_input(step_num, step_data)

        return user_inputs

    def _extract_step_user_input(self, step_number: int, step_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract user input fields from a step's data.

        Args:
            step_number: Step number
            step_data: Step data dictionary

        Returns:
            Extracted user input fields
        """
        if step_number == 4:
            # Expert Opinion & Content Guidance
            return {
                "expert_opinion": step_data.get("expert_opinion", ""),
                "writing_style": step_data.get("writing_style", ""),
                "question_answers": step_data.get("question_answers", [])
            }

        elif step_number == 5:
            # Secondary Keywords
            return {
                "keywords": step_data.get("keywords", [])
            }

        elif step_number == 9:
            # Data Collection
            return {
                "data_points": step_data.get("data_points", [])
            }

        elif step_number == 10:
            # Tools Research
            return {
                "tools": step_data.get("tools", [])
            }

        elif step_number == 11:
            # Resource Links
            return {
                "links": step_data.get("links", [])
            }

        elif step_number == 12:
            # Credibility Elements
            return {
                "facts": step_data.get("facts", []),
                "experiences": step_data.get("experiences", []),
                "quotes": step_data.get("quotes", [])
            }

        elif step_number == 22:
            # Final Review Checklist - Tool improvement feedback
            return {
                "feedback": step_data.get("feedback", step_data.get("notes", ""))  # Backward compatible
            }

        return {}

    async def save_user_inputs_to_db(self, session_id: str):
        """
        Extract user inputs from a session and save to plagiarism database.

        Args:
            session_id: Session identifier
        """
        # Extract user inputs
        user_inputs = await self.extract_user_inputs_from_session(session_id)

        # Load existing database
        plagiarism_db = await self._load_plagiarism_db()

        # Check if session already exists (update if so)
        existing_idx = None
        for idx, entry in enumerate(plagiarism_db.get("blogs", [])):
            if entry["session_id"] == session_id:
                existing_idx = idx
                break

        if existing_idx is not None:
            # Update existing entry
            plagiarism_db["blogs"][existing_idx] = user_inputs
            logger.info(f"Updated user inputs for session {session_id} in plagiarism database")
        else:
            # Add new entry
            plagiarism_db["blogs"].append(user_inputs)
            logger.info(f"Added user inputs for session {session_id} to plagiarism database")

        # Save database
        await self._save_plagiarism_db(plagiarism_db)

    async def check_plagiarism_for_session(
        self,
        session_id: str,
        n: int = 5
    ) -> Dict[str, Any]:
        """
        Check plagiarism for a session against all past sessions.

        Args:
            session_id: Session identifier
            n: N-gram size (default: 5)

        Returns:
            Dictionary with plagiarism results per step:
            {
                "session_id": "...",
                "overall_plagiarism_score": 0.0-1.0,
                "steps": {
                    "4": {
                        "has_plagiarism": true,
                        "overall_score": 0.35,
                        "level": "acceptable",
                        "color": "yellow",
                        "matches_from_blogs": [
                            {
                                "blog_session_id": "session_xyz",
                                "blog_keyword": "AI voice agents",
                                "blog_created_at": "2024-12-01T10:00:00Z",
                                "plagiarism_details": {
                                    "overall_score": 0.35,
                                    "matches": [...]
                                }
                            }
                        ]
                    },
                    ...
                }
            }
        """
        logger.info(f"Checking plagiarism for session {session_id}")

        # Load current session user inputs
        current_inputs = await self.extract_user_inputs_from_session(session_id)

        # Load plagiarism database (past sessions)
        plagiarism_db = await self._load_plagiarism_db()
        past_blogs = [
            blog for blog in plagiarism_db.get("blogs", [])
            if blog["session_id"] != session_id  # Exclude current session
        ]

        logger.info(f"Comparing against {len(past_blogs)} past blogs")

        results = {
            "session_id": session_id,
            "primary_keyword": current_inputs.get("primary_keyword", ""),
            "steps": {}
        }

        step_scores = []

        # Check each user input step
        for step_num in self.user_input_steps:
            step_key = str(step_num)
            current_step_data = current_inputs.get("steps", {}).get(step_key)

            if not current_step_data:
                # Step was skipped or has no data
                continue

            step_result = {
                "has_plagiarism": False,
                "overall_score": 0.0,
                "level": "unique",
                "color": "green",
                "matches_from_blogs": []
            }

            # Compare against each past blog
            for past_blog in past_blogs:
                past_step_data = past_blog.get("steps", {}).get(step_key)

                if not past_step_data:
                    continue

                # Check plagiarism for this step
                plagiarism_details = check_step_plagiarism(
                    current_step_data,
                    past_step_data,
                    step_num,
                    n
                )

                # Only record if there's actual similarity
                if plagiarism_details["overall_score"] > 0.2:  # 20% threshold
                    step_result["has_plagiarism"] = True
                    step_result["matches_from_blogs"].append({
                        "blog_session_id": past_blog["session_id"],
                        "blog_keyword": past_blog.get("primary_keyword", ""),
                        "blog_created_at": past_blog.get("created_at", ""),
                        "plagiarism_details": plagiarism_details
                    })

            # Calculate overall score for this step (max score from all matches)
            if step_result["matches_from_blogs"]:
                step_result["overall_score"] = max(
                    match["plagiarism_details"]["overall_score"]
                    for match in step_result["matches_from_blogs"]
                )
                step_result["level"] = get_plagiarism_level(step_result["overall_score"])
                step_result["color"] = get_plagiarism_color(step_result["overall_score"])

                step_scores.append(step_result["overall_score"])

            results["steps"][step_key] = step_result

        # Calculate overall plagiarism score (average of all step scores)
        results["overall_plagiarism_score"] = (
            sum(step_scores) / len(step_scores) if step_scores else 0.0
        )
        results["overall_level"] = get_plagiarism_level(results["overall_plagiarism_score"])
        results["overall_color"] = get_plagiarism_color(results["overall_plagiarism_score"])

        logger.info(
            f"Plagiarism check complete for {session_id}. "
            f"Overall score: {results['overall_plagiarism_score']:.2%} "
            f"({results['overall_level']})"
        )

        return results

    async def _load_plagiarism_db(self) -> Dict[str, Any]:
        """Load plagiarism database (user inputs from all sessions)."""
        if not self.plagiarism_db_file.exists():
            # Create directory if needed
            self.plagiarism_db_file.parent.mkdir(parents=True, exist_ok=True)

            # Initialize empty database
            empty_db = {
                "created_at": datetime.utcnow().isoformat(),
                "last_updated": datetime.utcnow().isoformat(),
                "blogs": []
            }
            await write_json_file(self.plagiarism_db_file, empty_db)
            return empty_db

        db = await read_json_file(self.plagiarism_db_file)
        return db

    async def _save_plagiarism_db(self, db: Dict[str, Any]):
        """Save plagiarism database."""
        db["last_updated"] = datetime.utcnow().isoformat()
        await write_json_file(self.plagiarism_db_file, db)

    async def get_all_past_sessions(self) -> List[Dict[str, Any]]:
        """
        Get list of all past sessions from plagiarism database.

        Returns:
            List of session metadata
        """
        db = await self._load_plagiarism_db()
        return [
            {
                "session_id": blog["session_id"],
                "primary_keyword": blog.get("primary_keyword", ""),
                "blog_type": blog.get("blog_type", ""),
                "created_at": blog.get("created_at", "")
            }
            for blog in db.get("blogs", [])
        ]


# Singleton instance
plagiarism_service = PlagiarismService()
