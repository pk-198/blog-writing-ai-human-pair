"""
API routes for all 22 workflow steps.
Provides REST endpoints for executing, skipping, and retrieving step data.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from urllib.parse import unquote, urlparse

from app.core.dependencies import get_current_user
from app.services.workflow_service import workflow_service
from app.core.logger import setup_logger

logger = setup_logger(__name__)

router = APIRouter(prefix="/api/steps", tags=["steps"])


# Request/Response Models
class StepExecuteRequest(BaseModel):
    """Request model for executing a step."""
    session_id: str = Field(..., description="Session identifier")
    input_data: Optional[Dict[str, Any]] = Field(None, description="Input data for human steps")

    @classmethod
    def model_validate(cls, obj):
        """Validate and URL-decode session_id if needed."""
        if isinstance(obj, dict) and 'session_id' in obj:
            obj['session_id'] = unquote(obj['session_id'])
        return super().model_validate(obj)


class StepSkipRequest(BaseModel):
    """Request model for skipping a step."""
    session_id: str = Field(..., description="Session identifier")
    reason: str = Field(..., description="Reason for skipping the step")

    @classmethod
    def model_validate(cls, obj):
        """Validate and URL-decode session_id if needed."""
        if isinstance(obj, dict) and 'session_id' in obj:
            obj['session_id'] = unquote(obj['session_id'])
        return super().model_validate(obj)


class StepUpdateRequest(BaseModel):
    """Request model for updating step data (for human edits)."""
    session_id: str = Field(..., description="Session identifier")
    updated_data: Dict[str, Any] = Field(..., description="Updated step data")

    @classmethod
    def model_validate(cls, obj):
        """Validate and URL-decode session_id if needed."""
        if isinstance(obj, dict) and 'session_id' in obj:
            obj['session_id'] = unquote(obj['session_id'])
        return super().model_validate(obj)


class StepResponse(BaseModel):
    """Response model for step execution."""
    success: bool
    step_number: int
    step_name: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    duration_seconds: Optional[float] = None


# ============================================================================
# PHASE 1: RESEARCH & DISCOVERY (Steps 1-4)
# ============================================================================

@router.post("/1/search-intent", response_model=StepResponse)
async def execute_step1(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 1: Search Intent Analysis

    AI analyzes SERP results to determine primary search intent.

    **Owner:** AI

    **Input:** None (uses primary keyword from session)

    **Output:**
    - primary_intent: Identified intent (informational, commercial, transactional, navigational)
    - intent_breakdown: Percentage breakdown of all intents
    - recommended_direction: Which intent to pursue
    - serp_analysis: Analysis of top 10 SERP results
    """
    logger.info(f"Step 1 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=1,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 1 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/2/competitor-fetch", response_model=StepResponse)
async def execute_step2(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 2: Competitor Content Fetch

    AI fetches top 5 competitor pages using Tavily API.

    **Owner:** AI

    **Input:** None (uses primary keyword from session)

    **Output:**
    - competitors: List of 5 competitor pages with full content, headings, word count
    """
    logger.info(f"Step 2 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=2,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 2 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/2/add-manual-content")
async def add_manual_competitor_content(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 2 Extension: Add Manual Competitor Content

    Allows users to manually add competitor content after automated fetch,
    useful when scraping fails or when relevant paragraphs are found on other blogs.

    **Owner:** Creator

    **Input:**
    - manual_competitors: List of {url, title, content} entries

    **Output:**
    - Updated Step 2 data with merged competitors
    - manual_additions: Count of manually added entries
    """
    logger.info(f"Manual competitor addition requested by {current_user.get('username')} for session {request.session_id}")

    try:
        # Extract manual competitors from input data
        manual_competitors = request.input_data.get("manual_competitors", [])

        if not manual_competitors:
            raise HTTPException(status_code=400, detail="No manual competitors provided")

        # Validate each entry has required fields and valid data
        for idx, entry in enumerate(manual_competitors):
            # Check required fields exist
            if not all(key in entry for key in ["url", "title", "content"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual competitor {idx + 1} missing required fields: url, title, content"
                )

            # Validate URL format
            try:
                parsed_url = urlparse(entry["url"])
                if not all([parsed_url.scheme, parsed_url.netloc]):
                    raise ValueError("URL must include scheme (http/https) and domain")
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual competitor {idx + 1}: Invalid URL format - {str(e)}"
                )

            # Validate non-empty strings after trimming
            if not entry["title"].strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual competitor {idx + 1}: Title cannot be empty"
                )

            if not entry["content"].strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual competitor {idx + 1}: Content cannot be empty"
                )

        # Add manual competitors via workflow service
        updated_data = await workflow_service.add_manual_competitors(
            session_id=request.session_id,
            manual_competitors=manual_competitors
        )

        return {
            "success": True,
            "step_number": 2,
            "step_name": "Competitor Content Fetch (Manual Addition)",
            "data": updated_data,
            "message": f"Added {len(manual_competitors)} manual competitor(s)"
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Manual competitor addition failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/3/competitor-analysis", response_model=StepResponse)
async def execute_step3(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 3: Competitor Analysis

    AI analyzes competitor content to identify quintessential elements and differentiators.

    **Owner:** AI

    **Input:** None (uses competitor data from Step 2)

    **Output:**
    - quintessential_elements: Must-have elements present in ALL top results
    - differentiators: Unique elements that add credibility
    - sections_to_include: Recommended sections
    - sections_to_skip: Competitor-specific sections to avoid
    """
    logger.info(f"Step 3 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=3,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 3 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/4/webinar-points", response_model=StepResponse)
async def execute_step4(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 4: Expert Opinion/ QnA / Webinar/Podcast Points

    Human uploads transcript, AI extracts key points.

    **Owner:** AI + Human

    **Input Required:**
    - transcript: Full transcript text
    - guest_name: Guest speaker name
    - guest_role: Guest title/role

    **Output:**
    - talking_points: 10-15 key insights
    - actionable_advice: Practical tips
    - quotes: Notable quotes
    - examples: Case studies mentioned
    """
    logger.info(f"Step 4 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data required for Step 4")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=4,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 4 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE 2: KEYWORDS & CLUSTERING (Steps 5-6)
# ============================================================================

@router.post("/5/secondary-keywords", response_model=StepResponse)
async def execute_step5(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 5: Secondary Keywords

    Human researches and adds 8-12 secondary keywords.

    **Owner:** Human

    **Input Required:**
    - keywords: List of 8-12 secondary keyword strings

    **Output:**
    - secondary_keywords: Validated list of keywords
    - keyword_count: Number of keywords added
    """
    logger.info(f"Step 5 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'keywords' required for Step 5")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=5,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 5 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/6/blog-clustering", response_model=StepResponse)
async def execute_step6(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 6: Blog Clustering

    AI suggests blog clustering opportunities based on past content.

    **Owner:** AI

    **Input:** None (uses past_blogs data)

    **Output:**
    - should_cluster: Boolean recommendation
    - matching_blogs: List of related past blogs
    - cluster_topic: Suggested cluster topic
    - internal_link_opportunities: Recommended internal links
    """
    logger.info(f"Step 6 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=6,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 6 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE 3: OUTLINE & STRUCTURE (Steps 7-8)
# ============================================================================

@router.post("/7/outline-generation", response_model=StepResponse)
async def execute_step7(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 7: Outline Generation

    AI creates comprehensive blog outline with H1/H2/H3 hierarchy.

    **Owner:** AI

    **Input:** None (uses all previous step data)

    **Output:**
    - outline: Hierarchical structure with H1, H2, H3 headings
    - content_types: Suggestions for each section (list, narrative, data-driven)
    - special_sections: Placeholders for glossary, FAQs, myths
    """
    logger.info(f"Step 7 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=7,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 7 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/8/llm-optimization", response_model=StepResponse)
async def execute_step8(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 8: LLM Optimization Planning

    AI marks sections for LLM/GEO optimization techniques.

    **Owner:** AI

    **Input:** None (uses outline from Step 7)

    **Output:**
    - optimization_plan: Per-section optimization recommendations
    - glossary_sections: Which sections need glossary terms
    - what_is_sections: Sections needing "What is X" format
    - summary_sections: Sections needing 1-line summary openers
    """
    logger.info(f"Step 8 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=8,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 8 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE 4: CONTENT COLLECTION (Steps 9-13)
# ============================================================================

@router.post("/9/data-collection", response_model=StepResponse)
async def execute_step9(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 9: Data Collection

    Human collects 4-5 data points with sources for credibility.

    **Owner:** Human

    **Input Required:**
    - data_points: List of objects with 'statistic' and 'source' fields

    **Output:**
    - collected_data: Validated data points with sources
    - data_count: Number of data points collected
    """
    logger.info(f"Step 9 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'data_points' required for Step 9")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=9,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 9 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/10/tools-research", response_model=StepResponse)
async def execute_step10(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 10: Tools Research

    Human researches 3-5 tools/platforms to mention in the blog.

    **Owner:** Human

    **Input Required:**
    - tools: List of objects with 'name', 'description', 'url' fields

    **Output:**
    - tools_list: Validated tools with details
    - tools_count: Number of tools added
    """
    logger.info(f"Step 10 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'tools' required for Step 10")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=10,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 10 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/11/resource-links", response_model=StepResponse)
async def execute_step11(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 11: Resource Links

    Human adds 5-7 external resource links.

    **Owner:** Human

    **Input Required:**
    - links: List of objects with 'title', 'url', 'description' fields

    **Output:**
    - resource_links: Validated external links
    - links_count: Number of links added
    """
    logger.info(f"Step 11 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'links' required for Step 11")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=11,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 11 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/12/credibility-elements", response_model=StepResponse)
async def execute_step12(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 12: Credibility Elements

    Human adds first-person experiences and personal insights.

    **Owner:** Human

    **Input Required:**
    - experiences: List of first-person experience strings
    - insights: Personal insights or opinions

    **Output:**
    - credibility_elements: Personal experiences and insights
    - element_count: Number of elements added
    """
    logger.info(f"Step 12 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'experiences' required for Step 12")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=12,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 12 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/13/business-info-update", response_model=StepResponse)
async def execute_step13(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 13: Business Info Update

    Human updates dograh.txt with new business context if needed.

    **Owner:** Human

    **Input Optional:**
    - business_context: Updated business context text (if changes made)

    **Output:**
    - business_context: Current business context
    - updated: Whether context was updated
    """
    logger.info(f"Step 13 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=13,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 13 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/business-info")
async def save_business_info(
    request: Dict[str, str],
    current_user: Dict = Depends(get_current_user)
):
    """
    Save/Update Business Info File (dograh.txt)

    Allows updating the entire business_info file content.
    Used in Step 13 to edit business context.

    **Input:**
    - content: Full content to write to dograh.txt

    **Output:**
    - success: Boolean indicating success
    - message: Success/error message
    - content: The saved content
    """
    logger.info(f"Business info save requested by {current_user.get('username')}")

    try:
        content = request.get("content", "")

        if not content or not content.strip():
            raise HTTPException(status_code=400, detail="Content cannot be empty")

        # Get the business info file path
        from pathlib import Path
        from app.utils.file_ops import write_text_file

        backend_dir = Path(__file__).parent.parent.parent.parent.parent
        business_file = backend_dir / "data" / "business_info" / "dograh.txt"

        logger.debug(f"Writing business info to {business_file}")
        await write_text_file(business_file, content)
        logger.info(f"Business info file updated successfully ({len(content)} chars)")

        return {
            "success": True,
            "message": "Business info saved successfully",
            "content": content,
            "character_count": len(content)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save business info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save business info: {str(e)}")


# ============================================================================
# PHASE 5: PRE-DRAFT (Steps 14-16)
# ============================================================================

@router.post("/14/landing-page-eval", response_model=StepResponse)
async def execute_step14(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 14: Landing Page Evaluation

    AI suggests landing page opportunities based on blog content.

    **Owner:** AI

    **Input:** None

    **Output:**
    - suggestions: 2 landing page title options with descriptions
    - target_audience: Suggested target audience for each
    - conversion_points: Key conversion elements
    """
    logger.info(f"Step 14 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=14,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 14 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/15/infographic-planning", response_model=StepResponse)
async def execute_step15(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 15: Infographic Planning

    AI suggests 2 infographic ideas based on data points.

    **Owner:** AI

    **Input:** None (uses data from Step 9)

    **Output:**
    - infographic_ideas: 2 infographic suggestions with titles, data, format
    - recommended_format: Chart type (pie, bar, timeline, comparison)
    """
    logger.info(f"Step 15 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=15,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 15 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/16/title-creation", response_model=StepResponse)
async def execute_step16(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 16: Title Creation

    AI generates 3 SEO-optimized title options.

    **Owner:** AI

    **Input:** None

    **Output:**
    - title_options: 3 title options (~55 chars, starts with primary keyword, includes emoji/power word)
    - selected_title: Placeholder for human selection
    """
    logger.info(f"Step 16 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=16,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 16 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE 6: DRAFTING (Steps 17-19)
# ============================================================================

@router.post("/17/blog-draft", response_model=StepResponse)
async def execute_step17(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 17: Blog Draft Generation

    AI writes complete 2000-3000 word blog draft.

    **Owner:** AI

    **Input:** None (uses all collected data)

    **Output:**
    - blog_draft: Complete markdown blog content
    - word_count: Actual word count
    - sections_included: List of sections created
    """
    logger.info(f"Step 17 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=17,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 17 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/18/faq-accordion", response_model=StepResponse)
async def execute_step18(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 18: FAQ Accordion

    AI generates 6-10 FAQs based on "People Also Ask" patterns.

    **Owner:** AI

    **Input:** None (uses blog content from Step 17)

    **Output:**
    - faqs: List of question-answer pairs
    - faq_count: Number of FAQs generated
    """
    logger.info(f"Step 18 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=18,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 18 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/19/meta-description", response_model=StepResponse)
async def execute_step19(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 19: Meta Description

    AI creates 150-160 character meta description.

    **Owner:** AI

    **Input:** None

    **Output:**
    - meta_description: SEO-optimized meta description
    - character_count: Actual character count
    """
    logger.info(f"Step 19 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=19,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 19 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# PHASE 7: POLISH & EXPORT (Steps 20-22)
# ============================================================================

@router.post("/20/ai-signal-removal", response_model=StepResponse)
async def execute_step20(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 20: AI Signal Removal

    AI removes AI-written signals and clichés from content.

    **Owner:** AI

    **Input:** None (uses blog draft from Step 17)

    **Output:**
    - cleaned_content: Blog with AI signals removed
    - changes_made: List of specific fixes applied
    - warnings: Any remaining issues detected
    """
    logger.info(f"Step 20 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=20,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 20 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/21/final-review", response_model=StepResponse)
async def execute_step21(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 21: Final Review Checklist

    Human performs final review against checklist.

    **Owner:** Human

    **Input Required:**
    - checklist_items: Dict of checklist items with boolean completion status
    - notes: Optional review notes

    **Output:**
    - review_status: completed/needs_revision
    - checklist_results: Completed checklist
    - review_notes: Final notes from human
    """
    logger.info(f"Step 21 execution requested by {current_user.get('username')} for session {request.session_id}")

    if not request.input_data:
        raise HTTPException(status_code=400, detail="input_data with 'checklist_items' required for Step 21")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=21,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Step 21 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/22/export-archive", response_model=StepResponse)
async def execute_step22(
    request: StepExecuteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Step 22: Export & Archive

    AI exports final blog and archives session.

    **Owner:** AI

    **Input:** None

    **Output:**
    - exported_file: Path to final markdown file
    - archived: Whether session was archived
    - blog_index_updated: Whether past_blogs index was updated
    """
    logger.info(f"Step 22 execution requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.execute_step(
            session_id=request.session_id,
            step_number=22,
            input_data=request.input_data
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step 22 execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.post("/skip", response_model=StepResponse)
async def skip_step(
    step_number: int,
    request: StepSkipRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Skip a specific step with reason.

    Allows human to skip optional steps when not applicable.
    """
    logger.info(f"Step {step_number} skip requested by {current_user.get('username')} for session {request.session_id}")

    try:
        result = await workflow_service.skip_step(
            session_id=request.session_id,
            step_number=step_number,
            reason=request.reason
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step {step_number} skip failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{step_number}/update", response_model=StepResponse)
async def update_step_data(
    step_number: int,
    request: StepUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Update step data after human edits.

    Allows creators to tweak AI-generated content in critical steps (1, 3, 7, 19).
    """
    logger.info(f"Step {step_number} data update requested by {current_user.get('username')} for session {request.session_id}")

    # Define expected fields for each editable step
    EXPECTED_FIELDS = {
        1: ["primary_intent", "intent_breakdown", "recommended_direction", "serp_analysis", "duplicates_existing", "selected_blog_urls", "custom_blog_urls", "total_selected_blogs"],
        3: ["analysis", "quintessential_elements", "differentiators", "recommended_sections"],
        7: ["outline", "h1", "sections", "total_sections"],
        19: ["meta_description", "character_count", "within_limit"]
    }

    try:
        # Validate that updates are only for editable steps
        if step_number not in EXPECTED_FIELDS:
            logger.warning(f"Attempt to edit non-editable step {step_number} by {current_user.get('username')}")
            raise HTTPException(
                status_code=400,
                detail=f"Step {step_number} is not editable. Only steps 1, 3, 7, and 19 can be edited."
            )

        # Get current state
        state = await workflow_service.get_session_state(request.session_id)

        # Update the step data
        step_key = str(step_number)
        if step_key in state.get("steps", {}):
            # Store old data for audit trail
            old_data = state["steps"][step_key]["data"].copy()

            # Update with new data
            state["steps"][step_key]["data"].update(request.updated_data)

            # Save updated state
            await workflow_service.update_session_state(request.session_id, state)

            # Detailed audit logging
            changed_fields = list(request.updated_data.keys())
            logger.info(
                f"Step {step_number} data updated by {current_user.get('username')} | "
                f"Session: {request.session_id} | "
                f"Fields changed: {', '.join(changed_fields)} | "
                f"Timestamp: {datetime.now().isoformat()}"
            )

            # Log detailed changes for each field
            for field, new_value in request.updated_data.items():
                old_value = old_data.get(field, "NOT_SET")
                logger.debug(
                    f"Field '{field}' changed | "
                    f"Old: {str(old_value)[:100]}... | "
                    f"New: {str(new_value)[:100]}..."
                )

            return StepResponse(
                success=True,
                step_number=step_number,
                step_name=state["steps"][step_key].get("step_name", f"Step {step_number}"),
                data=state["steps"][step_key]["data"],
                duration_seconds=0
            )
        else:
            raise HTTPException(status_code=404, detail=f"Step {step_number} not found in session")

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Step {step_number} update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/status")
async def get_workflow_status(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get current workflow status for a session.

    Returns:
    - current_step: Current step number
    - completed_steps: List of completed step numbers
    - pending_steps: List of pending step numbers
    - session_status: Session status (active/paused/completed)
    """
    logger.debug(f"Workflow status requested for session {session_id}")

    try:
        state = await workflow_service.get_session_state(session_id)

        completed_steps = []
        pending_steps = []

        for step_num in range(1, 23):
            step_key = str(step_num)
            step_status = state["steps"][step_key]["status"]

            if step_status == "completed":
                completed_steps.append(step_num)
            elif step_status == "pending":
                pending_steps.append(step_num)

        return {
            "session_id": session_id,
            "current_step": state["current_step"],
            "completed_steps": completed_steps,
            "pending_steps": pending_steps,
            "session_status": state["status"],
            "primary_keyword": state["primary_keyword"],
            "created_at": state["created_at"],
            "updated_at": state["updated_at"]
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get workflow status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}/download-blog")
async def download_blog_export(
    session_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Download the exported blog markdown file for a session.

    Returns the latest blog_export_*.md file from the session directory.
    """
    logger.info(f"Blog download requested for session {session_id} by {current_user.get('username')}")

    try:
        from pathlib import Path
        import glob

        # Get session path
        session_path = workflow_service._get_session_path(session_id)

        # Find all blog export files (there may be multiple versions)
        export_files = list(session_path.glob("blog_export_*.md"))

        if not export_files:
            raise HTTPException(
                status_code=404,
                detail=f"No exported blog file found for session {session_id}. Please complete Step 22 first."
            )

        # Get the most recent export file (sorted by name which includes timestamp)
        latest_export = sorted(export_files)[-1]

        logger.info(f"Serving blog export file: {latest_export.name}")

        return FileResponse(
            path=str(latest_export),
            media_type="text/markdown",
            filename=latest_export.name,
            headers={
                "Content-Disposition": f'attachment; filename="{latest_export.name}"'
            }
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to download blog export: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
