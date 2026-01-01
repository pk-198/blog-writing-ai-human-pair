"""
API routes for all 15 webinar workflow steps.
Provides REST endpoints for executing webinar-to-blog workflow steps.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from urllib.parse import unquote

from app.core.dependencies import get_current_user
from app.services.webinar_workflow_service import webinar_workflow_service
from app.core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api/webinar-steps", tags=["webinar-steps"])


# Request/Response Models
class WebinarStepExecuteRequest(BaseModel):
    """Request model for executing a webinar step."""
    session_id: str = Field(..., description="Webinar session identifier")
    input_data: Optional[Dict[str, Any]] = Field(None, description="Input data for human steps")

    @classmethod
    def model_validate(cls, obj):
        """Validate and URL-decode session_id if needed."""
        if isinstance(obj, dict) and 'session_id' in obj:
            obj['session_id'] = unquote(obj['session_id'])
        return super().model_validate(obj)


class WebinarStepResponse(BaseModel):
    """Response model for webinar step execution."""
    success: bool
    step_number: int
    step_name: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None


# ============================================================================
# WEBINAR WORKFLOW STEPS (1-15)
# ============================================================================

@router.post("/1/topic", response_model=WebinarStepResponse)
async def execute_webinar_step1(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 1: Webinar Topic Input (Human)

    Collect webinar topic, guest info, and target audience.

    **Owner:** Human

    **Input:**
    - webinar_topic: Webinar title/topic (required, 10-200 chars)
    - guest_name: Guest name (optional)
    - guest_credentials: Guest credentials/title (optional)
    - target_audience: Target audience (optional)

    **Output:**
    - webinar_topic: Topic captured
    - guest_name, guest_credentials, target_audience
    - topic_word_count
    """
    logger.info(f"Webinar Step 1 execution requested by {current_user.get('username')}")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=1,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Webinar Step 1 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/2/competitor-fetch", response_model=WebinarStepResponse)
async def execute_webinar_step2(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 2: Competitor Content Fetch (AI)

    Fetch competitor blogs using Tavily search based on webinar topic.

    **Owner:** AI

    **Input:** None (uses webinar topic from Step 1)

    **Output:**
    - competitors: List of competitor URLs with titles, snippets
    - total_fetched: Number of competitors found
    - search_query: Search query used
    """
    logger.info(f"Webinar Step 2 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=2,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 2 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/2/fetch-selected", response_model=WebinarStepResponse)
async def fetch_selected_webinar_competitors(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 2 (Phase 2): Fetch Full Content for Selected Competitors

    Fetches full blog content for user-selected competitor URLs using Tavily extract API.

    **Owner:** AI (with human selection)

    **Input:**
    - selected_urls: List of competitor URLs to fetch full content for

    **Output:**
    - competitors: Updated list with full content for selected URLs
    - selected_count: Number of competitors with full content
    - total_words: Combined word count of all selected content
    """
    logger.info(f"Webinar Step 2 fetch-selected requested")

    try:
        # Validate input: Must have selected_urls array
        if not request.input_data or "selected_urls" not in request.input_data:
            raise HTTPException(status_code=400, detail="selected_urls required in input_data")

        selected_urls = request.input_data.get("selected_urls", [])

        # Ensure at least one competitor is selected
        if not selected_urls or len(selected_urls) == 0:
            raise HTTPException(status_code=400, detail="At least one URL must be selected")

        # Import the fetch function (lazy import to avoid circular dependencies)
        from app.services.webinar_step_implementations import execute_webinar_step2_fetch_selected

        # Load current session state to get existing competitor data from Phase 1
        session_state = await webinar_workflow_service.get_session_state(request.session_id)

        # Execute Phase 2: Fetch full content for selected URLs using Tavily extract API
        # This replaces 300-char snippets with full blog content (5000+ chars each)
        result_data = await execute_webinar_step2_fetch_selected(
            workflow_service=webinar_workflow_service,
            session_id=request.session_id,
            state=session_state,
            selected_urls=selected_urls
        )

        # CRITICAL: Use update_step_data() instead of manual dict manipulation
        # This ensures proper Pydantic validation, timestamps, and atomic saves
        # FIX (2025-01-02): Previously used non-existent load_session/save_session methods
        await webinar_workflow_service.update_step_data(
            session_id=request.session_id,
            step_number=2,
            data=result_data,
            status="completed"  # Mark step as fully complete after Phase 2
        )

        return WebinarStepResponse(
            success=True,
            step_number=2,
            step_name="Competitor Content Fetch (Full)",
            data=result_data,
            duration_seconds=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webinar Step 2 fetch-selected failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/3/competitor-analysis", response_model=WebinarStepResponse)
async def execute_webinar_step3(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 3: Competitor Analysis (AI)

    Analyze competitor content for common topics, structural patterns, and style.

    **Owner:** AI

    **Input:** None (uses competitor data from Step 2)

    **Output:**
    - common_topics: Topics covered by competitors
    - structural_patterns: How competitors organize content
    - writing_style: Tone, voice, perspective
    - key_insights: What makes content effective
    """
    logger.info(f"Webinar Step 3 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=3,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 3 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/4/transcript", response_model=WebinarStepResponse)
async def execute_webinar_step4(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 4: Webinar Transcript Input (Human)

    Accept and validate webinar/podcast transcript.

    **Owner:** Human

    **Input:**
    - transcript: Full transcript text (required)

    **Output:**
    - transcript: Preview of transcript
    - transcript_file: File path
    - word_count: Number of words
    - has_speaker_labels: Boolean
    - format: plain_text
    """
    logger.info(f"Webinar Step 4 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=4,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 4 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/5/guidelines", response_model=WebinarStepResponse)
async def execute_webinar_step5(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 5: Content Guidelines Input (Human)

    Collect what to emphasize, avoid, and tone preferences.

    **Owner:** Human

    **Input:**
    - emphasize: List of points to emphasize (optional)
    - avoid: List of points to avoid (optional)
    - tone_preference: Tone/style preferences (optional)

    **Output:**
    - emphasize, avoid, tone_preference
    - has_guidelines: Boolean
    """
    logger.info(f"Webinar Step 5 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=5,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 5 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/6/outline", response_model=WebinarStepResponse)
async def execute_webinar_step6(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 6: Outline Generation (AI)

    Generate blog outline from transcript + guidelines + competitor insights.

    **Owner:** AI

    **Input:** None (uses transcript, guidelines, competitor insights)

    **Output:**
    - introduction: Intro direction
    - sections: List of main sections with subsections
    - conclusion: Conclusion direction
    - estimated_word_count: Target word count
    """
    logger.info(f"Webinar Step 6 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=6,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 6 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/7/llm-optimization", response_model=WebinarStepResponse)
async def execute_webinar_step7(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 7: LLM Optimization Planning (AI)

    Identify 3-4 glossary terms and 2-3 "What is X?" sections from outline.

    **Owner:** AI

    **Input:** None (uses outline from Step 6)

    **Output:**
    - glossary_items: List of glossary terms (max 4)
    - what_is_sections: List of "What is X" sections (max 3)
    - total_additions: Total optimization markers
    """
    logger.info(f"Webinar Step 7 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=7,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 7 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/8/landing-page", response_model=WebinarStepResponse)
async def execute_webinar_step8(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 8: Landing Page Evaluation (AI)

    Analyze webinar for landing page opportunities (products/topics discussed).

    **Owner:** AI

    **Input:** None (uses transcript and topic)

    **Output:**
    - has_potential: Boolean
    - confidence: high|medium|low
    - landing_page_ideas: List of landing page ideas (max 2)
    """
    logger.info(f"Webinar Step 8 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=8,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 8 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/9/infographic", response_model=WebinarStepResponse)
async def execute_webinar_step9(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 9: Infographic Planning (AI)

    Identify data-heavy sections suitable for infographics.

    **Owner:** AI

    **Input:** None (uses outline from Step 6)

    **Output:**
    - infographic_ideas: List of infographic ideas
    - total_ideas: Number of ideas
    - recommendation: Recommendation text
    """
    logger.info(f"Webinar Step 9 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=9,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 9 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/10/title", response_model=WebinarStepResponse)
async def execute_webinar_step10(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 10: Title Generation (AI)

    Generate 3 SEO-optimized title options.

    **Owner:** AI

    **Input:** None (uses topic, outline, competitor insights)

    **Output:**
    - title_options: List of 3 title options
    - recommended_title: Recommended title
    - total_options: Number of options
    """
    logger.info(f"Webinar Step 10 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=10,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 10 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/11/draft", response_model=WebinarStepResponse)
async def execute_webinar_step11(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 11: Blog Draft Generation (AI)

    Generate complete blog draft from transcript following outline.

    **Owner:** AI

    **Input:** None (uses transcript, outline, guidelines, LLM optimization, title)

    **Output:**
    - draft: Complete blog content (markdown)
    - word_count: Number of words
    - sections_completed: Number of sections
    - llm_markers_inserted: Number of optimization markers inserted
    - draft_file: File path
    """
    logger.info(f"Webinar Step 11 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=11,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 11 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/12/meta", response_model=WebinarStepResponse)
async def execute_webinar_step12(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 12: Meta Description (AI)

    Generate SEO-optimized meta description (140-160 chars).

    **Owner:** AI

    **Input:** None (uses outline and title)

    **Output:**
    - meta_description: Meta description text
    - character_count: Number of characters
    - includes_keyword: Boolean
    """
    logger.info(f"Webinar Step 12 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=12,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 12 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/13/ai-signal", response_model=WebinarStepResponse)
async def execute_webinar_step13(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 13: AI Signal Removal (AI)

    Remove AI-generated patterns and phrases from draft.

    **Owner:** AI

    **Input:** None (uses draft from Step 11)

    **Output:**
    - cleaned_draft: Cleaned blog content
    - changes_made: Number of changes
    - ai_signals_removed: List of signals removed
    - word_count: Final word count
    - cleaned_file: File path
    """
    logger.info(f"Webinar Step 13 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=13,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 13 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/14/export", response_model=WebinarStepResponse)
async def execute_webinar_step14(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 14: Export & Archive (AI)

    Export final blog as markdown with metadata.

    **Owner:** AI

    **Input:** None (uses cleaned draft and metadata)

    **Output:**
    - export_file: Export filename
    - export_path: Full file path
    - word_count: Final word count
    - title, meta_description
    - session_status: "completed"
    """
    logger.info(f"Webinar Step 14 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=14,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 14 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/15/review", response_model=WebinarStepResponse)
async def execute_webinar_step15(
    request: WebinarStepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 15: Final Review Checklist (Human)

    Creator reviews final blog and confirms readiness.

    **Owner:** Human

    **Input:**
    - review_completed: Boolean (required)
    - checklist_items: List of checklist items (optional)
    - feedback: Reviewer feedback (optional)

    **Output:**
    - review_completed: Boolean
    - checklist_items: List of items
    - feedback: Feedback text
    - reviewer_approval: Boolean
    """
    logger.info(f"Webinar Step 15 execution requested")

    try:
        result = await webinar_workflow_service.execute_step(
            session_id=request.session_id,
            step_number=15,
            input_data=request.input_data
        )
        return result
    except Exception as e:
        logger.error(f"Webinar Step 15 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

class WebinarStepSkipRequest(BaseModel):
    """Request model for skipping a webinar step."""
    session_id: str = Field(..., description="Webinar session identifier")
    reason: str = Field(..., description="Reason for skipping")


@router.post("/skip", response_model=WebinarStepResponse)
async def skip_webinar_step(
    step_number: int,
    request: WebinarStepSkipRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Skip a webinar workflow step with reason.

    Query Parameters:
        step_number: Step number to skip (1-15)

    Request Body:
        session_id: Webinar session identifier
        reason: Reason for skipping this step

    Returns:
        Success response with updated session state
    """
    logger.info(f"Step {step_number} skip requested by creator for session {request.session_id}")

    try:
        result = await webinar_workflow_service.skip_step(
            session_id=request.session_id,
            step_number=step_number,
            reason=request.reason
        )
        return result
    except Exception as e:
        logger.error(f"Webinar step {step_number} skip failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/download")
async def download_webinar_blog_export(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Download Exported Webinar Blog

    Downloads the latest webinar blog export markdown file for the session.

    Args:
        session_id: Webinar session identifier
        current_user: Authenticated user

    Returns:
        FileResponse with the markdown file as attachment

    Raises:
        HTTPException: If session or export file not found
    """
    logger.info(f"Webinar blog download requested by {current_user.get('username')} for session {session_id}")

    try:
        # Get session path
        session_path = webinar_workflow_service._get_session_path(session_id)

        # Find the latest webinar export file
        export_files = list(session_path.glob("webinar_blog_export_*.md"))

        if not export_files:
            logger.warning(f"No export file found for session {session_id}")
            raise HTTPException(
                status_code=404,
                detail="No blog export found for this session. Please complete Step 14 first."
            )

        # Get the most recent export file (sorted by filename timestamp)
        latest_export = sorted(export_files)[-1]

        logger.info(f"Serving webinar blog export: {latest_export.name}")

        # Return file as downloadable attachment
        from fastapi.responses import FileResponse
        return FileResponse(
            path=str(latest_export),
            media_type="text/markdown",
            filename=latest_export.name,
            headers={
                "Content-Disposition": f'attachment; filename="{latest_export.name}"'
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webinar blog download failed for session {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
