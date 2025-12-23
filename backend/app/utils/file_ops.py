"""
File operation utilities for reading/writing to the data directory.
Handles JSON files, text files, and session directory management.
"""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional
import aiofiles
from app.core.config import settings


class FileOperations:
    """Utility class for filesystem operations in the data directory."""

    @staticmethod
    def get_data_path(relative_path: str) -> Path:
        """
        Convert relative data path to absolute path.

        Args:
            relative_path: Path relative to data directory (e.g., "sessions/session_123")

        Returns:
            Absolute Path object
        """
        base_dir = Path(__file__).parent.parent.parent.parent  # Go up to project root
        data_dir = base_dir / "data"
        return data_dir / relative_path

    @staticmethod
    async def read_json(file_path: str) -> Optional[Dict[str, Any]]:
        """
        Read and parse JSON file.

        Args:
            file_path: Relative path from data directory

        Returns:
            Parsed JSON as dictionary, or None if file doesn't exist
        """
        full_path = FileOperations.get_data_path(file_path)

        if not full_path.exists():
            return None

        try:
            async with aiofiles.open(full_path, 'r') as f:
                content = await f.read()
                return json.loads(content)
        except Exception as e:
            print(f"Error reading JSON file {file_path}: {e}")
            return None

    @staticmethod
    async def write_json(file_path: str, data: Dict[str, Any]) -> bool:
        """
        Write dictionary to JSON file.

        Args:
            file_path: Relative path from data directory
            data: Dictionary to write as JSON

        Returns:
            True if successful, False otherwise
        """
        full_path = FileOperations.get_data_path(file_path)

        # Create parent directories if they don't exist
        full_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            async with aiofiles.open(full_path, 'w') as f:
                await f.write(json.dumps(data, indent=2, default=str))
            return True
        except Exception as e:
            print(f"Error writing JSON file {file_path}: {e}")
            return False

    @staticmethod
    async def read_text(file_path: str) -> Optional[str]:
        """
        Read text file.

        Args:
            file_path: Relative path from data directory

        Returns:
            File content as string, or None if file doesn't exist
        """
        full_path = FileOperations.get_data_path(file_path)

        if not full_path.exists():
            return None

        try:
            async with aiofiles.open(full_path, 'r') as f:
                return await f.read()
        except Exception as e:
            print(f"Error reading text file {file_path}: {e}")
            return None

    @staticmethod
    async def append_text(file_path: str, content: str) -> bool:
        """
        Append content to text file.

        Args:
            file_path: Relative path from data directory
            content: Text to append

        Returns:
            True if successful, False otherwise
        """
        full_path = FileOperations.get_data_path(file_path)

        # Create parent directories if they don't exist
        full_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            async with aiofiles.open(full_path, 'a') as f:
                await f.write(content)
            return True
        except Exception as e:
            print(f"Error appending to text file {file_path}: {e}")
            return False

    @staticmethod
    def create_session_directory(session_id: str) -> bool:
        """
        Create directory structure for a new session.

        Args:
            session_id: Unique session identifier

        Returns:
            True if successful, False otherwise
        """
        session_path = FileOperations.get_data_path(f"sessions/{session_id}")

        try:
            # Create main session directory
            session_path.mkdir(parents=True, exist_ok=True)

            # Create subdirectories
            (session_path / "competitor_content").mkdir(exist_ok=True)
            (session_path / "draft_versions").mkdir(exist_ok=True)

            return True
        except Exception as e:
            print(f"Error creating session directory {session_id}: {e}")
            return False

    @staticmethod
    def generate_session_id(primary_keyword: str) -> str:
        """
        Generate unique session ID.

        Args:
            primary_keyword: Primary keyword for the blog

        Returns:
            Session ID in format: session_TIMESTAMP_KEYWORD
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        # Clean keyword: lowercase, replace spaces with underscores, limit length
        keyword_slug = primary_keyword.lower().replace(" ", "_")[:30]
        return f"session_{timestamp}_{keyword_slug}"

    @staticmethod
    async def initialize_session_state(session_id: str, primary_keyword: str) -> Dict[str, Any]:
        """
        Create initial session state from template.

        Args:
            session_id: Unique session identifier
            primary_keyword: Primary keyword for the blog

        Returns:
            Initial session state dictionary
        """
        # Load template
        template = await FileOperations.read_json("sessions/session_template_state.json")

        now = datetime.now(timezone.utc)

        if not template:
            # If template doesn't exist, create basic structure
            template = {
                "session_id": session_id,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "expires_at": (now + timedelta(hours=settings.SESSION_EXPIRY_HOURS)).isoformat(),
                "current_step": 1,
                "status": "active",
                "primary_keyword": primary_keyword,
                "steps": {}
            }
        else:
            # Update template with actual values
            template["session_id"] = session_id
            template["created_at"] = now.isoformat()
            template["updated_at"] = now.isoformat()
            template["expires_at"] = (now + timedelta(hours=settings.SESSION_EXPIRY_HOURS)).isoformat()
            template["primary_keyword"] = primary_keyword

        return template

    @staticmethod
    async def initialize_audit_log(session_id: str) -> Dict[str, Any]:
        """
        Create initial audit log from template.

        Args:
            session_id: Unique session identifier

        Returns:
            Initial audit log dictionary
        """
        return {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "entries": []
        }


# Convenience wrapper functions for backward compatibility
async def read_json_file(file_path: Path) -> Optional[Dict[str, Any]]:
    """Read JSON file from absolute path."""
    if not file_path.exists():
        return None
    try:
        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
            return json.loads(content)
    except Exception as e:
        print(f"Error reading JSON file {file_path}: {e}")
        return None


async def write_json_file(file_path: Path, data: Dict[str, Any]) -> bool:
    """Write dictionary to JSON file at absolute path."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(data, indent=2, default=str))
        return True
    except Exception as e:
        print(f"Error writing JSON file {file_path}: {e}")
        return False


async def read_text_file(file_path: Path) -> Optional[str]:
    """Read text file from absolute path."""
    if not file_path.exists():
        return None
    try:
        async with aiofiles.open(file_path, 'r') as f:
            return await f.read()
    except Exception as e:
        print(f"Error reading text file {file_path}: {e}")
        return None


async def write_text_file(file_path: Path, content: str) -> bool:
    """Write text to file at absolute path."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(content)
        return True
    except Exception as e:
        print(f"Error writing text file {file_path}: {e}")
        return False


async def append_text_file(file_path: Path, content: str) -> bool:
    """Append content to text file at absolute path."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        async with aiofiles.open(file_path, 'a') as f:
            await f.write(content)
        return True
    except Exception as e:
        print(f"Error appending to text file {file_path}: {e}")
        return False
