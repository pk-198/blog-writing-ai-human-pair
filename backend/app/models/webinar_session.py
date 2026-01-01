"""
Pydantic models for webinar session management.
Defines the structure of webinar session state, steps, and related data.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator


class WebinarStepInfo(BaseModel):
    """Information about a single webinar workflow step."""
    step_number: int
    step_name: str
    status: str = "pending"  # pending, in_progress, completed, skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    llm_prompt: Optional[str] = None  # Full prompt sent to LLM (for transparency)
    human_action: Optional[str] = None
    skipped: bool = False
    skip_reason: Optional[str] = Field(None, max_length=200)


class WebinarSessionState(BaseModel):
    """Complete webinar session state model matching state.json structure."""
    session_id: str
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    current_step: int = 1
    status: str = "active"  # active, paused, completed, expired

    # Webinar-specific metadata
    webinar_topic: str
    guest_name: Optional[str] = None
    guest_credentials: Optional[str] = None
    target_audience: Optional[str] = None
    content_format: str = "ghostwritten"  # ghostwritten (guest POV) or conversational (host+guest)

    schema_version: int = 1
    steps: Dict[str, WebinarStepInfo] = Field(default_factory=dict)


class WebinarSessionCreate(BaseModel):
    """Request model for creating a new webinar session."""
    webinar_topic: str = Field(..., min_length=10, max_length=200, description="Webinar title/topic")
    guest_name: Optional[str] = Field(None, max_length=100, description="Guest name(s)")
    guest_credentials: Optional[str] = Field(None, max_length=300, description="Guest credentials/title")
    target_audience: Optional[str] = Field(None, max_length=100, description="Target audience (e.g., developers, CTOs)")
    content_format: str = Field(default="ghostwritten", description="Blog format: 'ghostwritten' or 'conversational'")

    @field_validator('content_format')
    @classmethod
    def validate_content_format(cls, v: str) -> str:
        """Validate content format is one of the allowed values."""
        allowed = ["ghostwritten", "conversational"]
        if v not in allowed:
            raise ValueError(f'Content format must be one of: {", ".join(allowed)}')
        return v


class WebinarSessionResponse(BaseModel):
    """Response model for webinar session operations."""
    session_id: str
    created_at: datetime
    current_step: int
    status: str
    webinar_topic: str
    guest_name: Optional[str]
    guest_credentials: Optional[str]
    target_audience: Optional[str]
    content_format: str
    schema_version: int = 1


class WebinarStepUpdate(BaseModel):
    """Request model for updating a webinar step."""
    data: Dict[str, Any]
    human_action: Optional[str] = None
    skip: bool = False
    skip_reason: Optional[str] = Field(None, max_length=200)


class WebinarAuditLogEntry(BaseModel):
    """Single entry in the webinar audit log."""
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


class WebinarAuditLog(BaseModel):
    """Complete audit log for a webinar session."""
    session_id: str
    created_at: datetime
    entries: List[WebinarAuditLogEntry] = Field(default_factory=list)
