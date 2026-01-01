"""
Individual step implementation methods for the webinar workflow service.
Contains execution logic for all 15 steps of the webinar-to-blog creation workflow.

This file is imported by webinar_workflow_service.py.
"""

from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timezone
import json

from app.services.openai_service import openai_service
from app.services.tavily_service import tavily_service
from app.utils.file_ops import read_text_file, write_text_file, append_text_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)


async def execute_webinar_step1_topic(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Step 1: Webinar Topic Input (Human).
    Collects webinar topic, guest info, and target audience.
    """
    logger.info(f"[Webinar Step 1] Starting topic input (session: {session_id})")

    if not input_data:
        raise ValueError("Step 1 requires input_data with topic information")

    # Validate required fields
    webinar_topic = input_data.get("webinar_topic", "").strip()
    if not webinar_topic or len(webinar_topic) < 10:
        raise ValueError("Webinar topic must be at least 10 characters")

    # Extract optional fields
    guest_name = input_data.get("guest_name", "").strip() or None
    guest_credentials = input_data.get("guest_credentials", "").strip() or None
    target_audience = input_data.get("target_audience", "").strip() or None

    result = {
        "webinar_topic": webinar_topic,
        "guest_name": guest_name,
        "guest_credentials": guest_credentials,
        "target_audience": target_audience,
        "topic_word_count": len(webinar_topic.split()),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 1] Topic captured: '{webinar_topic}' | Guest: {guest_name or 'Not specified'}")
    return result


async def execute_webinar_step2_competitor_fetch(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 2: Competitor Content Fetch (AI).
    Fetches competitor blogs using Tavily search based on webinar topic.
    """
    # Get webinar topic from Step 1
    step1_data = state["steps"].get("1", {}).get("data", {})
    webinar_topic = step1_data.get("webinar_topic")

    if not webinar_topic:
        raise ValueError("Step 1 data not found. Cannot fetch competitors without topic.")

    logger.info(f"[Webinar Step 2] Fetching competitor content for topic: '{webinar_topic}'")

    # Search using Tavily
    search_results = await tavily_service.search_serp(webinar_topic, num_results=10)

    logger.info(f"[Webinar Step 2] Found {len(search_results.get('results', []))} search results")

    # Format results for frontend
    competitors = []
    for idx, result in enumerate(search_results.get("results", [])[:10], 1):
        competitors.append({
            "rank": idx,
            "url": result.get("url", ""),
            "title": result.get("title", "No title"),
            "snippet": result.get("content", "")[:300],  # First 300 chars
            "content_length": len(result.get("content", "")),
            "fetch_status": "success" if result.get("content") else "no_content"
        })

    result = {
        "competitors": competitors,
        "total_fetched": len(competitors),
        "search_query": webinar_topic,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 2] Successfully fetched {len(competitors)} competitor URLs")
    return result


async def execute_webinar_step2_fetch_selected(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    selected_urls: List[str]
) -> Dict[str, Any]:
    """
    Step 2 (Phase 2): Fetch Full Content for Selected Competitor URLs.

    CONTEXT: This is the second phase of Step 2. Phase 1 searches for competitors
    and returns 300-char snippets. Phase 2 fetches full blog content for user-selected URLs.

    WHY: Step 3 needs full blog content (5000+ chars) to perform deep competitor analysis.
    Snippets are insufficient for understanding structure, tone, and content patterns.

    ADDED: 2025-01-02 to fix bug where Step 3 was analyzing inadequate snippets.

    Args:
        workflow_service: Session management service
        session_id: Current webinar session ID
        state: Full session state containing Step 2 Phase 1 data
        selected_urls: List of competitor URLs to fetch full content for

    Returns:
        Dict with updated competitors array, each selected competitor having:
        - content: Full blog text (5000+ chars)
        - word_count: Number of words in content
        - selected: True/False flag
        - fetch_status: "success" | "failed" | "error"
    """
    # Get competitor data from Phase 1 (search results with snippets only)
    step2_data = state["steps"].get("2", {}).get("data", {})
    competitors = step2_data.get("competitors", [])

    if not competitors:
        raise ValueError("No competitors found from initial Step 2 search")

    logger.info(f"[Webinar Step 2 Fetch] Fetching full content for {len(selected_urls)} selected URLs")

    # Process each competitor: fetch full content if selected, mark as unselected otherwise
    updated_competitors = []
    total_words = 0
    selected_count = 0

    for comp in competitors:
        # Check if this competitor was selected by the user
        if comp.get("url") in selected_urls:
            # Fetch full blog content using Tavily extract API
            # This replaces the 300-char snippet with complete article text
            try:
                logger.info(f"[Webinar Step 2 Fetch] Extracting content from: {comp.get('url')}")
                extracted = await tavily_service.extract_content(comp.get("url"))

                if extracted and extracted.get("content"):
                    # SUCCESS: Update competitor with full content
                    comp["content"] = extracted.get("content")  # Full blog text (5000+ chars)
                    comp["word_count"] = extracted.get("word_count", 0)
                    comp["selected"] = True  # Mark as selected for Step 3 filtering
                    comp["fetch_status"] = "success"
                    total_words += comp["word_count"]
                    selected_count += 1
                    logger.info(f"[Webinar Step 2 Fetch] Success: {comp['word_count']} words from {comp.get('url')}")
                else:
                    # FAILED: Tavily returned empty content
                    comp["selected"] = True
                    comp["fetch_status"] = "failed"
                    logger.warning(f"[Webinar Step 2 Fetch] Failed to extract content from: {comp.get('url')}")
            except Exception as e:
                # ERROR: Network failure, timeout, or invalid URL
                comp["selected"] = True
                comp["fetch_status"] = "error"
                logger.error(f"[Webinar Step 2 Fetch] Error extracting {comp.get('url')}: {str(e)}")
        else:
            # Competitor was NOT selected by user - mark as unselected
            comp["selected"] = False

        updated_competitors.append(comp)

    result = {
        "competitors": updated_competitors,
        "total_fetched": len(competitors),
        "selected_count": selected_count,
        "total_words": total_words,
        "search_query": step2_data.get("search_query", ""),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 2 Fetch] Complete: {selected_count}/{len(selected_urls)} succeeded, {total_words} total words")
    return result


async def execute_webinar_step3_competitor_analysis(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 3: Competitor Analysis (AI).

    PURPOSE: Analyzes competitor content for common topics, structural patterns, and style
    to inform outline generation and content strategy.

    REQUIRES: Step 2 Phase 2 must be complete (full content fetched, not just snippets).

    FIXED: 2025-01-02 - Now analyzes full blog content instead of 300-char snippets.
    """
    # Get data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step2_data = state["steps"].get("2", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")
    competitors = step2_data.get("competitors", [])

    if not competitors:
        raise ValueError("No competitor content found from Step 2")

    # VALIDATION: Ensure Step 2 Phase 2 (fetch-selected) was executed
    # Phase 1 only provides snippets - we need Phase 2 for full content
    # We check if any competitor has the "selected" field (added in Phase 2)
    has_phase2 = any(c.get("selected") is not None for c in competitors)
    if not has_phase2:
        raise ValueError("Step 2 Phase 2 not completed. Please select and fetch competitors first.")

    # Filter to ONLY selected competitors with full content
    # Exclude: (1) unselected competitors, (2) selected but failed fetches
    selected_competitors = [c for c in competitors if c.get("selected") and c.get("content")]

    if not selected_competitors:
        raise ValueError("No selected competitors with full content. All competitor fetches may have failed. Please check Step 2.")

    logger.info(f"[Webinar Step 3] Analyzing {len(selected_competitors)} selected competitor blogs for '{webinar_topic}'")

    # Build competitor summaries for OpenAI analysis
    # CRITICAL: Use "content" field (full blog text), NOT "snippet" (300 chars)
    # FIX (2025-01-02): Previously passed snippets, causing shallow analysis
    competitor_summaries = []
    for comp in selected_competitors:
        competitor_summaries.append({
            "title": comp.get("title"),
            "content": comp.get("content"),  # FULL CONTENT (5000+ chars) instead of snippet
            "url": comp.get("url"),
            "word_count": comp.get("word_count", 0)  # Now an int, not a string
        })

    # Analyze with OpenAI
    analysis, llm_prompt = await openai_service.analyze_webinar_competitors(
        webinar_topic,
        competitor_summaries
    )

    result = {
        "common_topics": analysis.get("common_topics", []),
        "structural_patterns": analysis.get("structural_patterns", ""),
        "writing_style": analysis.get("writing_style", ""),
        "key_insights": analysis.get("key_insights", []),  # Array of insights, not string
        "competitors_analyzed": len(competitor_summaries),
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 3] Analysis complete. Found {len(result['common_topics'])} common topics")
    return result


async def execute_webinar_step4_transcript(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Step 4: Webinar Transcript Input (Human).
    Accepts and validates webinar/podcast transcript.
    """
    logger.info(f"[Webinar Step 4] Starting transcript input (session: {session_id})")

    if not input_data:
        raise ValueError("Step 4 requires input_data with transcript")

    transcript = input_data.get("transcript", "").strip()
    if not transcript:
        raise ValueError("Transcript cannot be empty")

    # Save transcript to file
    word_count = len(transcript.split())
    session_path = workflow_service._get_session_path(session_id)
    transcript_file = session_path / "transcript.txt"
    await write_text_file(transcript_file, transcript)

    # Detect if transcript has speaker labels
    has_speaker_labels = any(label in transcript[:500] for label in ["Speaker", "Host:", "Guest:", "[", "]"])

    result = {
        "transcript": transcript[:1000] + "..." if len(transcript) > 1000 else transcript,  # Store preview
        "transcript_file": "transcript.txt",
        "word_count": word_count,
        "character_count": len(transcript),
        "has_speaker_labels": has_speaker_labels,
        "format": "plain_text",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 4] Transcript uploaded: {word_count} words, speakers: {has_speaker_labels}")
    return result


async def execute_webinar_step5_guidelines(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Step 5: Content Guidelines Input (Human).
    Collects what to emphasize, avoid, and tone preferences.
    """
    logger.info(f"[Webinar Step 5] Starting content guidelines input (session: {session_id})")

    if not input_data:
        # Allow skipping with empty guidelines
        input_data = {}

    emphasize = input_data.get("emphasize", [])
    avoid = input_data.get("avoid", [])
    tone_preference = input_data.get("tone_preference", "").strip() or "conversational and informative"

    # Convert string to list if needed
    if isinstance(emphasize, str):
        emphasize = [line.strip() for line in emphasize.split("\n") if line.strip()]
    if isinstance(avoid, str):
        avoid = [line.strip() for line in avoid.split("\n") if line.strip()]

    result = {
        "emphasize": emphasize,
        "avoid": avoid,
        "tone_preference": tone_preference,
        "has_guidelines": bool(emphasize or avoid),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 5] Guidelines captured: {len(emphasize)} emphasis points, {len(avoid)} avoid points")
    return result


async def execute_webinar_step6_outline(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 6: Outline Generation (AI).
    Generates blog outline from transcript + guidelines + competitor insights.
    """
    # Get data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step3_data = state["steps"].get("3", {}).get("data", {})
    step4_data = state["steps"].get("4", {}).get("data", {})
    step5_data = state["steps"].get("5", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")
    guest_name = step1_data.get("guest_name")
    content_format = state.get("content_format", "ghostwritten")

    # Load full transcript from file
    session_path = workflow_service._get_session_path(session_id)
    transcript_file = session_path / "transcript.txt"
    transcript = await read_text_file(transcript_file)

    competitor_insights = {
        "common_topics": step3_data.get("common_topics", []),
        "structural_patterns": step3_data.get("structural_patterns", "")
    }

    guidelines = {
        "emphasize": step5_data.get("emphasize", []),
        "avoid": step5_data.get("avoid", []),
        "tone": step5_data.get("tone_preference", "conversational")
    }

    logger.info(f"[Webinar Step 6] Generating outline for '{webinar_topic}' | Format: {content_format}")

    # Generate outline with OpenAI
    outline, llm_prompt = await openai_service.generate_webinar_outline(
        webinar_topic=webinar_topic,
        transcript=transcript,
        competitor_insights=competitor_insights,
        guidelines=guidelines,
        content_format=content_format,
        guest_name=guest_name
    )

    result = {
        "h1_placeholder": outline.get("h1_placeholder", "[Main Title Placeholder]"),
        "sections": outline.get("sections", []),
        "special_sections": outline.get("special_sections", {}),
        "total_sections": len(outline.get("sections", [])),
        "content_format": content_format,
        "llm_prompt": llm_prompt,
        "summary": f"Generated outline with {len(outline.get('sections', []))} main sections",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 6] Outline generated: {len(result['sections'])} sections with structured subsections")
    return result


async def execute_webinar_step7_llm_optimization(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 7: LLM Optimization Planning (AI).
    Identifies 3-4 glossary terms and 2-3 "What is X?" sections from outline.
    """
    # Get data from previous steps
    step6_data = state["steps"].get("6", {}).get("data", {})

    # Transform outline sections from Step 6 format to expected format
    # Step 6 format: {"h2": "heading", "subsections": [...]}
    # Expected format: {"section_number": 1, "heading": "heading", "subsections": [...]}
    # FIX (2025-01-02): Now includes subsections (h3 headings) so LLM sees full outline structure
    # Previously only passed h2 headings, causing LLM to miss detailed context from subsections
    raw_sections = step6_data.get("sections", [])
    outline_sections = [
        {
            "section_number": idx + 1,
            "heading": section.get("h2", f"Section {idx + 1}"),
            "subsections": section.get("subsections", [])  # Include h3 subsections for full context
        }
        for idx, section in enumerate(raw_sections)
    ]

    logger.info(f"[Webinar Step 7] Planning LLM optimization markers (outline has {len(outline_sections)} sections)")

    # Extract glossary terms and "What is X" sections from outline
    optimization, llm_prompt = await openai_service.plan_webinar_llm_optimization(
        outline_sections=outline_sections
    )

    result = {
        "glossary_items": optimization.get("glossary_items", [])[:4],  # Max 4
        "what_is_sections": optimization.get("what_is_sections", [])[:3],  # Max 3
        "total_additions": len(optimization.get("glossary_items", [])[:4]) + len(optimization.get("what_is_sections", [])[:3]),
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 7] Planned {len(result['glossary_items'])} glossary terms + {len(result['what_is_sections'])} 'What is' sections")
    return result


async def execute_webinar_step8_landing_page(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 8: Landing Page Evaluation (AI).
    Analyzes webinar for landing page opportunities (products/topics discussed).
    """
    # Get data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step6_data = state["steps"].get("6", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")

    # Load transcript
    session_path = workflow_service._get_session_path(session_id)
    transcript_file = session_path / "transcript.txt"
    transcript = await read_text_file(transcript_file)

    logger.info(f"[Webinar Step 8] Evaluating landing page potential from webinar content")

    # Analyze landing page opportunities
    evaluation, llm_prompt = await openai_service.evaluate_webinar_landing_page(
        transcript=transcript,
        webinar_topic=webinar_topic
    )

    result = {
        "landing_page_suggestions": evaluation.get("landing_page_options", [])[:2],  # Max 2
        "count": len(evaluation.get("landing_page_options", [])),
        "recommendation": evaluation.get("recommendation", ""),
        "llm_prompt": llm_prompt,
        "summary": f"Suggested {len(evaluation.get('landing_page_options', []))} landing page opportunities",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 8] Landing page suggestions: {result['count']} opportunities identified")
    return result


async def execute_webinar_step9_infographic(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 9: Infographic Planning (AI).
    Identifies data-heavy sections suitable for infographics.
    """
    # Extract required data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step6_data = state["steps"].get("6", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic", "")
    outline = step6_data  # Full outline dict from Step 6

    # FIX (2025-01-02): Load transcript for infographic analysis
    # Previously passed empty data_points=[], causing LLM to generate generic suggestions
    # Now uses actual webinar transcript to identify specific data/stats mentioned in discussion
    session_path = workflow_service._get_session_path(session_id)
    transcript_file = session_path / "transcript.txt"
    transcript = await read_text_file(transcript_file)

    logger.info(f"[Webinar Step 9] Planning infographics from transcript and outline")

    # FIX (2025-01-02): Pass transcript via contextual_qa parameter for content analysis
    # This allows LLM to suggest infographics based on actual data points from webinar
    # rather than generic placeholders. data_points=[] kept for API compatibility
    infographic_plan, llm_prompt = await openai_service.suggest_infographics(
        primary_keyword=webinar_topic,
        primary_intent="webinar-to-blog conversion",
        recommended_direction="informational",
        outline=outline,
        data_points=[],  # Empty - webinar workflow doesn't have separate data collection
        business_context="",
        blog_type="",
        expert_opinion="",
        writing_style="",
        contextual_qa=transcript  # Transcript provides context for infographic suggestions
    )

    result = {
        "infographic_ideas": infographic_plan.get("infographic_options", []),
        "total_ideas": len(infographic_plan.get("infographic_options", [])),
        "recommendation": infographic_plan.get("recommendation", "Create 1-2 infographics"),
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 9] Identified {result['total_ideas']} infographic opportunities")
    return result


async def execute_webinar_step10_title(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 10: Title Generation (AI).
    Generates 3 SEO-optimized title options.
    """
    # Get data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step3_data = state["steps"].get("3", {}).get("data", {})
    step6_data = state["steps"].get("6", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")
    competitor_insights = step3_data.get("common_topics", [])
    outline = step6_data.get("sections", [])

    logger.info(f"[Webinar Step 10] Generating title options for '{webinar_topic}'")

    # Generate titles using the standard blog workflow method
    titles, llm_prompt = await openai_service.generate_titles(
        primary_keyword=webinar_topic,
        outline={"sections": outline} if isinstance(outline, list) else outline
    )

    # FIX (2025-01-02): Extract title strings from title_options objects for frontend compatibility
    # OpenAI returns: {"title_options": [{"title": "...", "character_count": 55, ...}, ...]}
    # Frontend expects: {"title_options": ["Title 1", "Title 2", "Title 3"]} (array of strings)
    # Previously tried to access non-existent "titles" field, causing "no title options generated" error
    title_objects = titles.get("title_options", [])  # Fixed from titles.get("titles", [])
    title_strings = [t.get("title", "") for t in title_objects]  # Extract just the title strings

    result = {
        "title_options": title_strings,  # Frontend expects array of strings (WebinarStep10Title.tsx line 124)
        "recommended_title": title_objects[0].get("title", "") if title_objects else "",  # First option as default
        "total_options": len(title_strings),
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 10] Generated {result['total_options']} title options")
    return result


async def execute_webinar_step11_draft(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 11: Blog Draft Generation (AI).
    Generates complete blog draft from transcript following outline.
    """
    # Get all required data
    step1_data = state["steps"].get("1", {}).get("data", {})
    step5_data = state["steps"].get("5", {}).get("data", {})
    step6_data = state["steps"].get("6", {}).get("data", {})
    step7_data = state["steps"].get("7", {}).get("data", {})
    step10_data = state["steps"].get("10", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")
    guest_name = step1_data.get("guest_name")
    content_format = state.get("content_format", "ghostwritten")

    # Load transcript
    session_path = workflow_service._get_session_path(session_id)
    transcript_file = session_path / "transcript.txt"
    transcript = await read_text_file(transcript_file)

    # Pass entire Step 6 data as outline (contains h2, subsections structure)
    # The OpenAI service will extract the "sections" array and format it properly
    outline = step6_data

    # Content guidelines from Step 5 (what to emphasize/avoid)
    guidelines = {
        "emphasize": step5_data.get("emphasize", []),
        "avoid": step5_data.get("avoid", []),
        "tone": step5_data.get("tone_preference", "conversational")
    }

    # LLM optimization markers from Step 7 (glossary, "What is X" sections)
    llm_optimization = {
        "glossary_items": step7_data.get("glossary_items", []),
        "what_is_sections": step7_data.get("what_is_sections", [])
    }

    selected_title = step10_data.get("recommended_title", webinar_topic)

    logger.info(f"[Webinar Step 11] Generating blog draft | Format: {content_format} | Target: 2000 words")

    # Generate complete blog draft using OpenAI
    # The outline will be formatted properly in openai_service.py (lines 2042-2049)
    # FIX (2025-01-02): Outline formatting now uses correct field names (h2, h3, etc.)
    draft, llm_prompt = await openai_service.generate_webinar_blog_draft(
        transcript=transcript,
        outline=outline,  # Full Step 6 data with sections array
        guidelines=guidelines,
        llm_optimization=llm_optimization,
        title=selected_title,
        content_format=content_format,
        guest_name=guest_name
    )

    # Save draft to filesystem for backup
    draft_file = session_path / "draft_v1.md"
    await write_text_file(draft_file, draft.get("content", ""))

    # Build result - CRITICAL field name alignment with frontend
    # FIX (2025-01-02): Changed "draft" → "blog_draft" to match frontend expectation
    # Frontend components reference stepData.blog_draft (WebinarStep11Draft.tsx lines 85, 92, 221)
    result = {
        "blog_draft": draft.get("content", ""),  # Must be "blog_draft" (not "draft")
        "word_count": draft.get("word_count", 0),
        "sections_completed": draft.get("sections_completed", 0),
        "llm_markers_inserted": draft.get("llm_markers_inserted", 0),
        "draft_file": "draft_v1.md",
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 11] Draft generated: {result['word_count']} words, {result['sections_completed']} sections")
    return result


async def execute_webinar_step12_meta(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 12: Meta Description (AI).
    Generates SEO-optimized meta description (140-160 chars).

    CONTEXT FIX (2025-01-02): Now passes formatted outline instead of blog draft summary.

    WHY: At Step 12, the blog draft (Step 11) exists but hasn't been reviewed/edited yet.
    Using the outline gives LLM better context about what the blog covers without relying
    on potentially unpolished draft content. The outline is structured and comprehensive.

    PREVIOUS BUG: Was passing empty or truncated blog_draft[:500], giving LLM no context.
    """
    # Get data from previous steps
    step1_data = state["steps"].get("1", {}).get("data", {})
    step6_data = state["steps"].get("6", {}).get("data", {})  # Outline with h2/h3 structure
    step10_data = state["steps"].get("10", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic", "")
    selected_title = step10_data.get("recommended_title", "")
    outline_sections = step6_data.get("sections", [])

    # Format outline into readable structure for LLM context
    # This replaces the empty/truncated blog draft that was previously used
    # FIX (2025-01-02): Extract h2 and h3 headings to give LLM full picture of blog content
    outline_context = ""
    for idx, section in enumerate(outline_sections, 1):
        h2 = section.get('h2', '')  # Main section heading
        outline_context += f"{idx}. {h2}\n"
        # Include subsections (h3) for complete context
        for sub in section.get('subsections', []):
            outline_context += f"   - {sub.get('h3', '')}\n"

    logger.info(f"[Webinar Step 12] Generating meta description for '{selected_title}'")

    # Generate meta description with formatted outline as context
    # The outline gives LLM clear understanding of blog structure and topics
    # Returns: (meta_description_string, llm_prompt_string) tuple
    meta_desc, llm_prompt = await openai_service.generate_meta_description(
        title=selected_title,
        primary_keyword=webinar_topic,
        secondary_keywords=[],  # Webinar workflow doesn't collect secondary keywords
        blog_summary=outline_context  # Formatted outline (better than empty/truncated draft)
    )

    # Build result - meta_desc is a string, not a dict
    result = {
        "meta_description": meta_desc,
        "character_count": len(meta_desc),
        "includes_keyword": webinar_topic.lower() in meta_desc.lower() if webinar_topic else False,
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 12] Meta description generated ({result['character_count']} chars)")
    return result


async def execute_webinar_step13_ai_signal(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 13: AI Signal Removal (AI).
    Removes AI-generated patterns and phrases from draft.
    """
    # Get draft from Step 11
    # FIX (2025-01-02): Step 11 returns "blog_draft" not "draft"
    # Accessing wrong field was causing empty draft or missing data
    step11_data = state["steps"].get("11", {}).get("data", {})
    draft = step11_data.get("blog_draft", "")

    if not draft:
        raise ValueError("No draft found from Step 11")

    logger.info(f"[Webinar Step 13] Removing AI signals from draft")

    # Clean draft
    cleaned, llm_prompt = await openai_service.remove_ai_signals(draft)

    # Save cleaned draft
    # FIX (2025-01-02): OpenAI service returns "cleaned_content" not "content"
    # Field name mismatch was causing empty cleaned draft to be saved/returned
    session_path = workflow_service._get_session_path(session_id)
    cleaned_file = session_path / "draft_cleaned.md"
    await write_text_file(cleaned_file, cleaned.get("cleaned_content", ""))

    result = {
        "cleaned_draft": cleaned.get("cleaned_content", ""),
        "changes_made": cleaned.get("changes_made", 0),
        "ai_signals_removed": cleaned.get("ai_signals_removed", []),
        "word_count": len(cleaned.get("cleaned_content", "").split()),
        "cleaned_file": "draft_cleaned.md",
        "llm_prompt": llm_prompt,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 13] AI signals removed: {result['changes_made']} changes made")
    return result


async def execute_webinar_step14_export(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 14: Export & Archive (AI).
    Exports final blog as markdown with metadata.
    """
    # Get final draft
    step13_data = state["steps"].get("13", {}).get("data", {})
    final_draft = step13_data.get("cleaned_draft", "")

    # Get metadata
    step1_data = state["steps"].get("1", {}).get("data", {})
    step10_data = state["steps"].get("10", {}).get("data", {})
    step12_data = state["steps"].get("12", {}).get("data", {})

    webinar_topic = step1_data.get("webinar_topic")
    guest_name = step1_data.get("guest_name")
    title = step10_data.get("recommended_title", webinar_topic)
    meta_description = step12_data.get("meta_description", "")

    logger.info(f"[Webinar Step 14] Exporting blog: '{title}'")

    # Create export with metadata
    export_content = f"""---
title: {title}
webinar_topic: {webinar_topic}
guest: {guest_name or 'N/A'}
meta_description: {meta_description}
created_date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}
session_id: {session_id}
---

{final_draft}
"""

    # Save export
    session_path = workflow_service._get_session_path(session_id)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    export_file = session_path / f"webinar_blog_export_{timestamp}.md"
    await write_text_file(export_file, export_content)

    # Mark session as completed
    await workflow_service.update_session_state(session_id, {"status": "completed"})

    # FIX (2025-01-02): Added missing fields expected by frontend
    # - export_timestamp: Used to display export time in UI (WebinarStep14Export.tsx line 138)
    # - included_elements: Shows what elements are in the export (WebinarStep14Export.tsx line 148)
    result = {
        "export_file": export_file.name,
        "export_path": str(export_file),
        "word_count": len(final_draft.split()),
        "title": title,
        "meta_description": meta_description,
        "session_status": "completed",
        "export_timestamp": datetime.now(timezone.utc).isoformat(),
        "included_elements": [
            "Blog Draft",
            "Metadata (Title, Topic, Guest)",
            "Meta Description",
            f"Content ({len(final_draft.split())} words)"
        ],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 14] Blog exported: {export_file.name}")
    return result


async def execute_webinar_step15_review(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Step 15: Final Review Checklist (Human).
    Creator reviews final blog and confirms readiness.
    """
    logger.info(f"[Webinar Step 15] Final review checklist (session: {session_id})")

    if not input_data:
        input_data = {}

    checklist_items = input_data.get("checklist_items", [
        "Transcript content accurately represented",
        "Guest quotes/statements preserved",
        "Key messages preserved",
        "Content guidelines followed",
        "SEO optimized",
        "AI signals removed",
        "Ready to publish"
    ])

    review_completed = input_data.get("review_completed", False)
    feedback = input_data.get("feedback", "").strip()

    result = {
        "review_completed": review_completed,
        "checklist_items": checklist_items,
        "feedback": feedback,
        "reviewer_approval": review_completed,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    logger.info(f"[Webinar Step 15] Review completed: {review_completed} | Feedback: {bool(feedback)}")
    return result
