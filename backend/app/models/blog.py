"""
Pydantic models for blog content and metadata.
Used for drafts, final export, and blog index entries.
"""

from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class BlogMetadata(BaseModel):
    """Metadata for a blog post."""
    title: str
    meta_description: str = Field(..., max_length=160)
    primary_keyword: str
    secondary_keywords: List[str] = Field(default_factory=list)
    author: str = "Dograh"  # Default to business name
    date: datetime
    word_count: int = 0


class FAQItem(BaseModel):
    """Single FAQ question and answer."""
    question: str
    answer: str


class BlogDraft(BaseModel):
    """Draft version of blog content."""
    session_id: str
    version: int = 1
    content: str  # Markdown content
    metadata: BlogMetadata
    created_at: datetime


class BlogExport(BaseModel):
    """Final blog export with all content."""
    metadata: BlogMetadata
    content: str  # Main markdown content
    faq_html: Optional[str] = None  # HTML accordion for FAQs
    last_updated: datetime


class BlogIndexEntry(BaseModel):
    """Entry in the blog index file."""
    title: str
    summary: str = Field(..., max_length=200)  # 2-line summary
    date: datetime
    primary_keyword: str
    session_id: str


class CompetitorContent(BaseModel):
    """Competitor content fetched from SERP."""
    url: str
    rank: int  # 1-5
    domain: str
    title: str
    full_text: str
    headings: Dict[str, List[str]]  # {"h1": [...], "h2": [...], "h3": [...]}
    images: List[str]  # URLs or descriptions
    outgoing_links: List[str]
    incoming_links: List[str] = Field(default_factory=list)
