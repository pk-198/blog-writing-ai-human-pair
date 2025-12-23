"""
Pydantic models for session management.
Defines the structure of session state, steps, and related data.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator


class StepData(BaseModel):
    """Base model for step-specific data."""
    pass


class StepInfo(BaseModel):
    """Information about a single workflow step."""
    step_number: int
    step_name: str
    status: str = "pending"  # pending, in_progress, completed, skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    human_action: Optional[str] = None
    skipped: bool = False
    skip_reason: Optional[str] = Field(None, max_length=200)


class SessionState(BaseModel):
    """Complete session state model matching state.json structure."""
    session_id: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    current_step: int = 1
    status: str = "active"  # active, paused, completed, expired
    primary_keyword: str
    blog_type: str  # Blog type description (e.g., "webinar: details", "comparison: details", etc.)
    steps: Dict[str, StepInfo] = Field(default_factory=dict)


class SessionCreate(BaseModel):
    """Request model for creating a new session."""
    primary_keyword: str = Field(..., min_length=1, max_length=200)
    blog_type: str = Field(..., min_length=10, description="Blog type with detailed description (minimum 10 words)")

    @field_validator('blog_type')
    @classmethod
    def validate_blog_type_word_count(cls, v: str) -> str:
        """Validate that blog_type contains at least 10 words."""
        word_count = len(v.split())
        if word_count < 10:
            raise ValueError(f'Blog type must contain at least 10 words. Current count: {word_count}')
        return v


class SessionResponse(BaseModel):
    """Response model for session operations."""
    session_id: str
    created_at: datetime
    current_step: int
    status: str
    primary_keyword: str
    blog_type: str


class StepUpdate(BaseModel):
    """Request model for updating a step."""
    data: Dict[str, Any]
    human_action: Optional[str] = None
    skip: bool = False
    skip_reason: Optional[str] = Field(None, max_length=200)


class AuditLogEntry(BaseModel):
    """Single entry in the audit log."""
    step_number: int
    step_name: str
    owner: str  # "AI", "Human", or "AI+Human"
    timestamp: datetime
    duration_minutes: int = 0
    summary: str
    human_action: Optional[str] = None
    data_snapshot: str = "state.json"
    skipped: bool = False
    skip_reason: Optional[str] = None


class AuditLog(BaseModel):
    """Complete audit log for a session."""
    session_id: str
    created_at: datetime
    entries: List[AuditLogEntry] = Field(default_factory=list)
