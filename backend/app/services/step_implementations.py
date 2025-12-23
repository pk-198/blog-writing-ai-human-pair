"""
Individual step implementation methods for the workflow service.
Contains execution logic for all 22 steps of the blog creation workflow.

This file is imported by workflow_service.py and methods are added to WorkflowService class.
"""

from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timezone

from app.services.openai_service import openai_service
from app.services.tavily_service import tavily_service
from app.utils.file_ops import read_text_file, write_text_file, append_text_file
from app.core.logger import setup_logger

logger = setup_logger(__name__)


# Import these methods into WorkflowService by adding them to the class

async def execute_step1_search_intent(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 1: Search Intent Analysis.
    Uses Tavily to fetch SERP and OpenAI to analyze intent.
    """
    primary_keyword = state["primary_keyword"]
    logger.info(f"[Step 1] Starting search intent analysis for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        # Fetch SERP results
        logger.debug(f"[Step 1] Fetching SERP data from Tavily for '{primary_keyword}'")
        serp_data = await tavily_service.search_serp(primary_keyword, num_results=10)
        logger.info(f"[Step 1] Retrieved {len(serp_data.get('results', []))} SERP results")

        # Log SERP result summary
        if serp_data.get('results'):
            logger.info(f"[Step 1] Top SERP Results:")
            for idx, result in enumerate(serp_data['results'][:5], 1):
                logger.info(f"  [{idx}] {result.get('title', 'No title')} - {result.get('url', 'No URL')}")

        # Load past blogs for duplicate check
        logger.debug(f"[Step 1] Loading past blogs for duplicate check")
        past_blogs = await workflow_service._load_past_blogs()
        logger.info(f"[Step 1] Loaded {len(past_blogs)} past blogs for comparison")

        # Analyze with GPT-4
        logger.info(f"[Step 1] Calling OpenAI GPT-4 for intent analysis...")
        logger.debug(f"[Step 1] OpenAI Input: keyword='{primary_keyword}', serp_count={len(serp_data.get('results', []))}, past_blogs_count={len(past_blogs)}")

        analysis = await openai_service.analyze_search_intent(
            primary_keyword,
            serp_data["results"],
            past_blogs
        )

        # Log detailed analysis results
        logger.info(f"[Step 1] Intent analysis complete. Found {len(analysis.get('intents', []))} intents")
        if analysis.get('intents'):
            logger.info(f"[Step 1] Detected Intents:")
            for intent in analysis['intents']:
                logger.info(f"  - {intent.get('type', 'unknown')}: {intent.get('percentage', 0)}% ({intent.get('evidence', 'no evidence')[:100]}...)")
        logger.info(f"[Step 1] Recommended Intent: {analysis.get('recommended_intent', 'none')}")
        logger.info(f"[Step 1] Recommended Direction: {analysis.get('recommended_direction', 'none')[:150]}...")
        logger.info(f"[Step 1] Duplicates Existing Content: {analysis.get('duplicates_existing', False)}")

        # Format result for frontend display
        intents = analysis.get('intents', [])
        result = {
            # Frontend expects these specific field names
            "primary_intent": analysis.get('recommended_intent', 'unknown'),
            "intent_breakdown": intents,  # Array of intent objects
            "recommended_direction": analysis.get('recommended_direction', ''),
            "serp_analysis": {
                "total_results": len(serp_data.get('results', [])),
                "top_results": [
                    {
                        "rank": idx + 1,
                        "title": result.get('title', 'No title'),
                        "url": result.get('url', ''),
                        "content_preview": result.get('content', '')[:200] + '...' if result.get('content') else ''
                    }
                    for idx, result in enumerate(serp_data.get('results', [])[:10])
                ]
            },
            "duplicates_existing": analysis.get('duplicates_existing', False),
            "duplication_notes": analysis.get('duplication_notes', ''),
            "summary": f"Analyzed search intent for '{primary_keyword}'. Found {len(intents)} intents.",
            # Also include raw data for debugging
            "_raw_serp": serp_data,
            "_raw_analysis": analysis
        }

        logger.info(f"[Step 1] Successfully completed search intent analysis (session: {session_id})")
        logger.debug(f"[Step 1] Returning result with fields: {list(result.keys())}")
        return result

    except Exception as e:
        logger.error(f"[Step 1] Error during search intent analysis: {str(e)}", exc_info=True)
        raise


async def execute_step2_competitor_fetch(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 2: Competitor Content Fetch.
    Fetches content for user-selected blogs from Step 1.
    """
    primary_keyword = state["primary_keyword"]
    logger.info(f"[Step 2] Starting competitor content fetch for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        # Read Step 1 data to get selected blogs
        step1_data = state["steps"].get("1", {}).get("data", {})
        selected_serp_urls = step1_data.get("selected_blog_urls", [])
        custom_urls = step1_data.get("custom_blog_urls", [])

        all_urls = selected_serp_urls + custom_urls

        # Validation: Ensure at least 1 URL is selected
        if len(all_urls) == 0:
            error_msg = (
                f"No blogs selected. "
                f"Please return to Step 1, select blogs from the SERP results "
                f"or add custom URLs, and click 'Save Blog Selection' before executing Step 2."
            )
            logger.error(f"[Step 2] No blog selection found")
            raise ValueError(error_msg)

        logger.info(f"[Step 2] Fetching {len(all_urls)} user-selected blogs ({len(selected_serp_urls)} from SERP, {len(custom_urls)} custom)")
        logger.debug(f"[Step 2] Selected URLs: {all_urls}")

        # Fetch content for each URL using Tavily extract endpoint
        competitors = []
        failed_urls = []

        for idx, url in enumerate(all_urls, 1):
            try:
                logger.info(f"[Step 2] Fetching content from URL {idx}/{len(all_urls)}: {url}")

                # Use Tavily extract endpoint to get full content
                competitor_data = await tavily_service.extract_content(url)

                if competitor_data and competitor_data.get("content"):
                    competitor_data["rank"] = idx
                    competitor_data["source"] = "user_selected"
                    competitors.append(competitor_data)
                    logger.info(f"[Step 2] Successfully fetched: {url} ({competitor_data.get('word_count', 0)} words)")
                else:
                    logger.warning(f"[Step 2] No content extracted from: {url}")
                    failed_urls.append({"url": url, "reason": "No content returned"})

            except Exception as e:
                logger.error(f"[Step 2] Failed to fetch {url}: {str(e)}")
                failed_urls.append({"url": url, "reason": str(e)})

        # Log fetch results (no minimum required - work with whatever we got)
        if len(competitors) == 0:
            logger.warning(f"[Step 2] No competitor blogs fetched successfully. Proceeding with 0 competitors.")
            warning_msg = "Unable to fetch any competitor content. Scrapers may be blocked or URLs invalid. You can proceed but blog quality may be reduced."
        elif len(competitors) < len(all_urls):
            logger.warning(f"[Step 2] Only {len(competitors)} of {len(all_urls)} blogs fetched successfully")
            warning_msg = f"Fetched {len(competitors)} of {len(all_urls)} blogs. Some URLs failed (check failed_urls for details)."
        else:
            logger.info(f"[Step 2] All {len(competitors)} blogs fetched successfully")
            warning_msg = None

        # Save competitor files
        session_path = workflow_service._get_session_path(session_id)
        competitor_dir = session_path / "competitor_content"
        logger.debug(f"[Step 2] Saving competitor data to {competitor_dir}")

        import json
        for idx, comp in enumerate(competitors, 1):
            comp_file = competitor_dir / f"competitor_{idx}_{comp['domain']}.json"
            with open(comp_file, 'w') as f:
                json.dump(comp, f, indent=2)

        logger.info(f"[Step 2] Completed | Fetched: {len(competitors)} | Failed: {len(failed_urls)} (session: {session_id})")

        result = {
            "competitors": competitors,
            "count": len(competitors),
            "total_requested": len(all_urls),
            "successful_fetches": len(competitors),
            "failed_fetches": len(failed_urls),
            "failed_urls": failed_urls if failed_urls else [],
            "summary": f"Fetched {len(competitors)} of {len(all_urls)} user-selected blogs"
        }

        # Add warning if some/all fetches failed
        if warning_msg:
            result["warning"] = warning_msg

        return result

    except Exception as e:
        logger.error(f"[Step 2] Error during competitor content fetch: {str(e)}", exc_info=True)
        raise


async def execute_step3_competitor_analysis(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 3: Competitor Analysis.
    Analyzes competitor content to identify patterns.
    """
    primary_keyword = state["primary_keyword"]
    logger.info(f"[Step 3] Starting competitor analysis for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        # Get competitor data from Step 2
        step2_data = state["steps"].get("2", {}).get("data", {})
        competitors = step2_data.get("competitors", [])
        logger.debug(f"[Step 3] Retrieved {len(competitors)} competitors from Step 2")

        if not competitors:
            logger.error(f"[Step 3] No competitor data found")
            raise ValueError("No competitor data found. Please complete Step 2 first.")

        # Analyze with GPT-4
        logger.debug(f"[Step 3] Sending {len(competitors)} competitors to OpenAI for analysis")
        analysis = await openai_service.analyze_competitors(
            primary_keyword,
            competitors
        )
        logger.info(f"[Step 3] Analysis complete. Found {len(analysis.get('quintessential_elements', []))} must-have elements")

        result = {
            "analysis": analysis,
            "quintessential_elements": analysis.get("quintessential_elements", []),
            "differentiators": analysis.get("differentiators", []),
            "recommended_sections": analysis.get("recommended_sections", []),
            "skip_sections": analysis.get("skip_sections", []),
            "summary": f"Analyzed {len(competitors)} competitors. Identified {len(analysis.get('quintessential_elements', []))} must-have elements."
        }

        logger.info(f"[Step 3] Successfully completed competitor analysis (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 3] Error during competitor analysis: {str(e)}", exc_info=True)
        raise


async def execute_step4_webinar_points(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 4: Expert Opinion & Content Guidance (Human Input) - TWO PHASES.
    Phase 1: Captures expert domain knowledge, writing style, transcript
    Phase 2: Generates 3 contextual questions, captures answers
    This provides authentic, fresh perspective and domain expertise to guide content creation.
    """
    logger.info(f"[Step 4] Starting expert opinion & content guidance collection (session: {session_id})")

    try:
        if not input_data:
            logger.error(f"[Step 4] No input data provided")
            raise ValueError("Expert opinion or content guidance is required for Step 4")

        # Determine which phase we're in
        phase = input_data.get("phase", "phase1")
        logger.info(f"[Step 4] Processing {phase}")

        if phase == "phase1":
            # PHASE 1: Collect expert opinion, writing style, transcript, then generate questions
            expert_opinion = input_data.get("expert_opinion", "").strip()
            writing_style = input_data.get("writing_style", "").strip()
            transcript = input_data.get("transcript", "").strip()
            guest_info = input_data.get("guest_info", {})

            logger.debug(f"[Step 4] Expert opinion length: {len(expert_opinion)} chars")
            logger.debug(f"[Step 4] Writing style length: {len(writing_style)} chars")
            logger.debug(f"[Step 4] Transcript length: {len(transcript)} chars")

            # Process transcript if provided (webinar/podcast case)
            extracted_points = []
            extracted_quotes = []
            if transcript:
                logger.debug(f"[Step 4] Processing transcript with GPT-4")
                extracted = await openai_service.extract_webinar_points(
                    transcript,
                    guest_info
                )
                extracted_points = extracted.get("talking_points", [])
                extracted_quotes = extracted.get("quotes", [])
                logger.info(f"[Step 4] Extracted {len(extracted_points)} talking points and {len(extracted_quotes)} quotes from transcript")

            # Load business context from dograh.txt
            backend_dir = Path(__file__).parent.parent.parent.parent
            business_info_path = backend_dir / "data" / "business_info" / "dograh.txt"
            business_context = ""
            try:
                business_context = await read_text_file(business_info_path)
                logger.debug(f"[Step 4] Loaded {len(business_context)} chars from business context")
            except Exception as e:
                logger.warning(f"[Step 4] Could not load business context: {e}")

            # Get Step 1 (intent), Step 2 (competitor content), and Step 3 (competitor analysis) data for context
            step1_data = state["steps"].get("1", {}).get("data", {})
            step2_data = state["steps"].get("2", {}).get("data", {})
            step3_data = state["steps"].get("3", {}).get("data", {})

            # Extract first competitor content from Step 2 for deeper context
            first_competitor = None
            competitors = step2_data.get("competitors", [])
            if competitors:
                first_competitor = competitors[0]
                logger.debug(f"[Step 4] Using first competitor content: {first_competitor.get('title', 'Unknown')[:50]}")

            # Generate 3 contextual questions using GPT-4
            logger.info(f"[Step 4] Generating contextual questions with GPT-4")
            questions_data = await openai_service.generate_contextual_questions(
                primary_keyword=state["primary_keyword"],
                blog_type=state.get("blog_type", ""),
                business_context=business_context,
                expert_opinion=expert_opinion,
                writing_style=writing_style,
                intent_data=step1_data,
                competitor_data=step3_data,
                first_competitor_content=first_competitor
            )

            questions = questions_data.get("questions", [])
            logger.info(f"[Step 4] Generated {len(questions)} contextual questions")

            result = {
                "phase": "phase1_complete",
                "expert_opinion": expert_opinion,
                "writing_style": writing_style,
                "transcript": transcript if transcript else None,
                "talking_points": extracted_points,
                "quotes": extracted_quotes,
                "guest_info": guest_info if transcript else {},
                "has_expert_input": bool(expert_opinion or writing_style),
                "has_transcript": bool(transcript),
                "questions": questions,  # AI-generated questions for user
                "awaiting_answers": True,
                "summary": f"Phase 1 complete. Generated {len(questions)} contextual questions for deeper insights."
            }

            logger.info(f"[Step 4 Phase 1] Successfully generated questions (session: {session_id})")
            return result

        elif phase == "phase2":
            # PHASE 2: Collect answers to the 3 contextual questions
            question_answers = input_data.get("question_answers", [])

            logger.info(f"[Step 4 Phase 2] Received {len(question_answers)} question answers")

            # Retrieve Phase 1 data from current step state
            current_step_data = state["steps"].get("4", {}).get("data", {})

            if not current_step_data.get("expert_opinion"):
                raise ValueError("Phase 1 data not found. Please complete Phase 1 first.")

            # Merge Phase 1 and Phase 2 data
            result = {
                "phase": "completed",
                "expert_opinion": current_step_data.get("expert_opinion", ""),
                "writing_style": current_step_data.get("writing_style", ""),
                "transcript": current_step_data.get("transcript"),
                "talking_points": current_step_data.get("talking_points", []),
                "quotes": current_step_data.get("quotes", []),
                "guest_info": current_step_data.get("guest_info", {}),
                "has_expert_input": current_step_data.get("has_expert_input", False),
                "has_transcript": current_step_data.get("has_transcript", False),
                "questions": current_step_data.get("questions", []),
                "question_answers": question_answers,  # User's answers to contextual questions
                "has_contextual_qa": bool(question_answers),
                "summary": f"Expert guidance captured with {len(question_answers)} contextual Q&A for enhanced blog quality."
            }

            logger.info(f"[Step 4] Successfully completed both phases (session: {session_id})")
            return result

        else:
            raise ValueError(f"Invalid phase: {phase}. Must be 'phase1' or 'phase2'")

    except Exception as e:
        logger.error(f"[Step 4] Error during expert opinion collection: {str(e)}", exc_info=True)
        raise


async def execute_step5_secondary_keywords(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 5: Secondary Keyword Collection (Human Input).
    Collects and organizes secondary keywords from human.
    """
    logger.info(f"[Step 5] Starting secondary keyword collection (session: {session_id})")

    try:
        if not input_data or not input_data.get("keywords"):
            logger.error(f"[Step 5] No keywords provided in input_data")
            raise ValueError("Keywords are required for Step 5")

        keywords = input_data["keywords"]
        logger.debug(f"[Step 5] Received keywords input: {type(keywords)}")

        if isinstance(keywords, str):
            # Parse comma-separated or newline-separated list
            keywords = [k.strip() for k in keywords.replace('\n', ',').split(',') if k.strip()]
            logger.debug(f"[Step 5] Parsed {len(keywords)} keywords from string")

        # Organize keywords
        primary = state["primary_keyword"]
        secondary = [k for k in keywords if k.lower() != primary.lower()]
        faq_keywords = input_data.get("faq_keywords", [])

        # Check if proceeding with fewer inputs
        proceed_with_fewer = input_data.get("proceed_with_fewer", False)
        fewer_inputs_reason = input_data.get("fewer_inputs_reason", "")

        # Generate warning if proceeding with fewer keywords
        if len(secondary) < 8 and proceed_with_fewer and fewer_inputs_reason:
            logger.warning(f"[Step 5] Proceeding with fewer inputs ({len(secondary)} keywords): {fewer_inputs_reason}")
            warning_msg = f"Proceeded with {len(secondary)} {'keyword' if len(secondary) == 1 else 'keywords'} (minimum 8 recommended). Reason: {fewer_inputs_reason}"
        else:
            warning_msg = None

        logger.info(f"[Step 5] Collected {len(secondary)} secondary keywords, {len(faq_keywords)} FAQ keywords")

        result = {
            "primary_keyword": primary,
            "secondary_keywords": secondary,
            "faq_keywords": faq_keywords,
            "total_count": len(keywords),
            "summary": f"Collected {len(secondary)} secondary keywords",
            "human_action": "Provided keyword list from research tools",
            "proceeded_with_fewer": proceed_with_fewer,
            "fewer_inputs_reason": fewer_inputs_reason if proceed_with_fewer else None
        }

        if warning_msg:
            result["warning"] = warning_msg

        logger.info(f"[Step 5] Successfully completed secondary keyword collection (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 5] Error during secondary keyword collection: {str(e)}", exc_info=True)
        raise


async def execute_step6_blog_clustering(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 6: Blog Clustering Check.
    Determines if blog should be clustered with existing content.
    """
    primary_keyword = state["primary_keyword"]
    logger.info(f"[Step 6] Starting blog clustering analysis for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        # Get selected intent from Step 1
        step1_data = state["steps"].get("1", {}).get("data", {})
        selected_intent = step1_data.get("intent_analysis", {}).get("recommended_intent", "informational")
        logger.debug(f"[Step 6] Using intent: '{selected_intent}'")

        # Load past blogs
        logger.debug(f"[Step 6] Loading past blogs for clustering check")
        past_blogs = await workflow_service._load_past_blogs()
        logger.debug(f"[Step 6] Loaded {len(past_blogs)} past blogs")

        # Build past blog data structure
        past_blog_data = []
        for blog_line in past_blogs[:20]:  # Check last 20 blogs
            parts = blog_line.split('|')
            if len(parts) >= 2:
                past_blog_data.append({
                    "title": parts[0].strip(),
                    "summary": parts[1].strip() if len(parts) > 1 else ""
                })
        logger.debug(f"[Step 6] Prepared {len(past_blog_data)} past blogs for clustering analysis")

        # Analyze clustering with GPT-4
        logger.debug(f"[Step 6] Sending data to OpenAI for clustering recommendation")
        clustering = await openai_service.suggest_blog_clustering(
            primary_keyword,
            selected_intent,
            past_blog_data
        )
        logger.info(f"[Step 6] Clustering recommendation: {clustering.get('should_cluster', False)}")

        result = {
            "clustering_recommendation": clustering,
            "should_cluster": clustering.get("should_cluster", False),
            "related_blogs": clustering.get("related_blogs", []),
            "cluster_topic": clustering.get("cluster_topic", ""),
            "summary": f"Clustering analysis complete. Should cluster: {clustering.get('should_cluster', False)}"
        }

        logger.info(f"[Step 6] Successfully completed blog clustering analysis (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 6] Error during blog clustering analysis: {str(e)}", exc_info=True)
        raise


async def execute_step7_outline_generation(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 7: Outline Generation.
    Generates comprehensive blog outline with H1/H2/H3 structure.
    """
    primary_keyword = state["primary_keyword"]
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 7] Starting outline generation for keyword: '{primary_keyword}' (session: {session_id})")
    if blog_type:
        logger.info(f"[Step 7] Blog type: {blog_type[:100]}...")

    try:
        # Gather all data from previous steps
        step1_data = state["steps"].get("1", {}).get("data", {})
        step3_data = state["steps"].get("3", {}).get("data", {})
        step4_data = state["steps"].get("4", {}).get("data", {})
        step5_data = state["steps"].get("5", {}).get("data", {})

        recommended_direction = step1_data.get("recommended_direction", "")
        secondary_keywords = step5_data.get("secondary_keywords", [])
        competitor_analysis = step3_data.get("analysis", {})

        # Extract expert guidance from Step 4
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        logger.debug(f"[Step 7] Using {len(secondary_keywords)} secondary keywords")
        logger.debug(f"[Step 7] Using competitor analysis from Step 3")
        if recommended_direction:
            logger.info(f"[Step 7] Using recommended direction from Step 1: {recommended_direction[:100]}...")
        if expert_opinion:
            logger.info(f"[Step 7] Using expert opinion from Step 4 ({len(expert_opinion)} chars)")
        if writing_style:
            logger.info(f"[Step 7] Using writing style guidance from Step 4 ({len(writing_style)} chars)")

        # Collect any data from Steps 4, 6
        collected_data = {}

        # Extract Q&A from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        contextual_qa = ""

        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 7] Using {len(answers)} contextual Q&A for outline generation")

        # Generate outline with GPT-4
        logger.debug(f"[Step 7] Sending data to OpenAI for outline generation")
        outline = await openai_service.generate_outline(
            primary_keyword,
            secondary_keywords,
            competitor_analysis,
            collected_data,
            blog_type,
            recommended_direction,
            expert_opinion,
            writing_style,
            contextual_qa
        )
        logger.info(f"[Step 7] Generated outline with {len(outline.get('sections', []))} main sections")

        # Add blog to index (moved from Step 22 - blog assumed to be completed once outline is generated)
        backend_dir = Path(__file__).parent.parent.parent.parent
        blog_index = backend_dir / "data" / "past_blogs" / "blog_index.txt"

        h1_title = outline.get("h1", primary_keyword)
        index_entry = f"\n{h1_title} | Outline created for '{primary_keyword}' | {datetime.now(timezone.utc).strftime('%Y-%m-%d')} | {primary_keyword}"
        logger.info(f"[Step 7] Adding blog to index: {h1_title}")
        logger.debug(f"[Step 7] Blog index path: {blog_index}")
        await append_text_file(blog_index, index_entry)

        result = {
            "outline": outline,
            "h1": outline.get("h1", ""),
            "sections": outline.get("sections", []),
            "total_sections": len(outline.get("sections", [])),
            "blog_index_updated": True,
            "summary": f"Generated outline with {len(outline.get('sections', []))} main sections. Blog added to index."
        }

        logger.info(f"[Step 7] Successfully completed outline generation and blog index update (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 7] Error during outline generation: {str(e)}", exc_info=True)
        raise


async def execute_step8_llm_optimization(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 8: LLM Optimization Planning.
    Marks sections for AI/GEO optimization.
    """
    logger.info(f"[Step 8] Starting LLM optimization planning (session: {session_id})")

    try:
        # Get primary keyword and blog description from session state
        primary_keyword = state["primary_keyword"]
        blog_type = state.get("blog_type", "")

        step7_data = state["steps"].get("7", {}).get("data", {})
        outline = step7_data.get("outline", {})

        if not outline:
            logger.error(f"[Step 8] Outline not found in Step 7 data")
            raise ValueError("Outline not found. Please complete Step 7 first.")

        logger.debug(f"[Step 8] Retrieved outline with {len(outline.get('sections', []))} sections")

        # Get competitor content from Step 2
        step2_data = state["steps"].get("2", {}).get("data", {})
        competitors = step2_data.get("competitors", [])
        logger.debug(f"[Step 8] Retrieved {len(competitors)} competitor content items")

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Plan optimization with GPT-4
        # Note: Removed Step 4 Q&A reuse - those questions are for content creation, not optimization
        logger.debug(f"[Step 8] Sending outline to OpenAI for optimization planning")
        logger.info(f"[Step 8] Context: keyword='{primary_keyword}', blog_type length={len(blog_type)}, competitors={len(competitors)}")

        optimization_plan = await openai_service.plan_llm_optimization(
            outline,
            primary_keyword=primary_keyword,
            blog_type=blog_type,
            competitors=competitors,
            expert_opinion=expert_opinion,
            writing_style=writing_style
        )
        logger.info(f"[Step 8] Created optimization plan for {len(optimization_plan.get('sections', []))} sections")

        result = {
            "optimization_plan": optimization_plan,
            "glossary_sections": optimization_plan.get("glossary_sections", []),
            "what_is_sections": optimization_plan.get("what_is_sections", []),
            "summary_sections": optimization_plan.get("summary_sections", []),
            "summary": f"LLM optimization plan created for {len(optimization_plan.get('sections', []))} sections"
        }

        logger.info(f"[Step 8] Successfully completed LLM optimization planning (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 8] Error during LLM optimization planning: {str(e)}", exc_info=True)
        raise


async def execute_step9_data_collection(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 9: Data Collection (Human Input).
    Collects data points with sources for each section.
    """
    logger.info(f"[Step 9] Starting data collection (session: {session_id})")

    try:
        if not input_data or not input_data.get("data_points"):
            logger.error(f"[Step 9] No data points provided in input_data")
            raise ValueError("Data points are required for Step 9")

        data_points = input_data["data_points"]
        logger.debug(f"[Step 9] Received {len(data_points)} data points")

        # Validate data structure (accepts both "content" and "statistic" for backward compatibility)
        validated_points = []
        for point in data_points:
            if isinstance(point, dict) and "source" in point:
                # Support both "statistic" (frontend) and "content" (backend) fields
                if "statistic" in point:
                    validated_points.append({
                        "statistic": point["statistic"],
                        "source": point["source"]
                    })
                elif "content" in point:
                    validated_points.append({
                        "statistic": point["content"],
                        "source": point["source"]
                    })

        logger.debug(f"[Step 9] Validated {len(validated_points)} data points")

        # Check if proceeding with fewer inputs
        proceed_with_fewer = input_data.get("proceed_with_fewer", False)
        fewer_inputs_reason = input_data.get("fewer_inputs_reason", "")

        # Validation with fewer inputs option
        if len(validated_points) < 4:
            if proceed_with_fewer and fewer_inputs_reason:
                logger.warning(f"[Step 9] Proceeding with fewer inputs ({len(validated_points)} data points): {fewer_inputs_reason}")
                warning_msg = f"Proceeded with {len(validated_points)} data points (minimum 4 recommended). Reason: {fewer_inputs_reason}"
            else:
                logger.error(f"[Step 9] Insufficient data points: {len(validated_points)} (minimum 4)")
                raise ValueError("Minimum 4 data points with sources required")
        else:
            warning_msg = None

        if len(validated_points) > 5:
            logger.error(f"[Step 9] Too many data points: {len(validated_points)} (maximum 5)")
            raise ValueError("Maximum 5 data points allowed")

        logger.info(f"[Step 9] Successfully collected {len(validated_points)} data points with citations")

        result = {
            "data_points": validated_points,
            "total_count": len(validated_points),
            "summary": f"Collected {len(validated_points)} data points with citations",
            "human_action": "Provided researched data points with source links",
            "proceeded_with_fewer": proceed_with_fewer,
            "fewer_inputs_reason": fewer_inputs_reason if proceed_with_fewer else None
        }

        if warning_msg:
            result["warning"] = warning_msg

        logger.info(f"[Step 9] Successfully completed data collection (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 9] Error during data collection: {str(e)}", exc_info=True)
        raise


async def execute_step10_tools_research(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 10: Tools Research (Conditional Human Input).
    Collects tool information if relevant.
    """
    logger.info(f"[Step 10] Starting tools research (session: {session_id})")

    try:
        if not input_data or not input_data.get("tools"):
            logger.info(f"[Step 10] Step skipped - not tools-focused content (session: {session_id})")
            return {
                "skipped": True,
                "reason": "Not tools-focused content",
                "summary": "Step marked as N/A - not a tools review/comparison blog"
            }

        tools = input_data["tools"]
        logger.debug(f"[Step 10] Received {len(tools)} tools")

        # Validate tool data structure
        for idx, tool in enumerate(tools):
            if not all(k in tool for k in ["name", "features", "url"]):
                logger.error(f"[Step 10] Tool {idx + 1} missing required fields")
                raise ValueError("Each tool must have name, features, and url")

        # Check if proceeding with fewer inputs
        proceed_with_fewer = input_data.get("proceed_with_fewer", False)
        fewer_inputs_reason = input_data.get("fewer_inputs_reason", "")

        # Validation with fewer inputs option
        if len(tools) < 3:
            if proceed_with_fewer and fewer_inputs_reason:
                logger.warning(f"[Step 10] Proceeding with fewer inputs ({len(tools)} tools): {fewer_inputs_reason}")
                warning_msg = f"Proceeded with {len(tools)} {'tool' if len(tools) == 1 else 'tools'} (minimum 3 recommended). Reason: {fewer_inputs_reason}"
            else:
                logger.error(f"[Step 10] Insufficient tools: {len(tools)} (minimum 3)")
                raise ValueError("Minimum 3 tools required")
        else:
            warning_msg = None

        logger.info(f"[Step 10] Validated {len(tools)} tools")

        result = {
            "tools": tools,
            "tool_count": len(tools),
            "summary": f"Collected information for {len(tools)} tools",
            "human_action": "Researched and provided tool details",
            "proceeded_with_fewer": proceed_with_fewer,
            "fewer_inputs_reason": fewer_inputs_reason if proceed_with_fewer else None
        }

        if warning_msg:
            result["warning"] = warning_msg

        logger.info(f"[Step 10] Successfully completed tools research (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 10] Error during tools research: {str(e)}", exc_info=True)
        raise


async def execute_step11_resource_links(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 11: Resource Links Collection (Human Input).
    Collects credible resource links.
    """
    logger.info(f"[Step 11] Starting resource links collection (session: {session_id})")

    try:
        if not input_data or not input_data.get("links"):
            logger.error(f"[Step 11] No resources provided in input_data")
            raise ValueError("Resource links are required for Step 11")

        resources = input_data["links"]
        logger.debug(f"[Step 11] Received {len(resources)} resources")

        # Categorize resources
        categorized = {
            "youtube": [],
            "reddit": [],
            "quora": [],
            "research_papers": [],
            "articles": [],
            "other": []
        }

        for resource in resources:
            url = resource.get("url", "").lower()
            if "youtube" in url:
                categorized["youtube"].append(resource)
            elif "reddit" in url:
                categorized["reddit"].append(resource)
            elif "quora" in url:
                categorized["quora"].append(resource)
            elif any(ext in url for ext in [".pdf", "arxiv", "scholar"]):
                categorized["research_papers"].append(resource)
            elif any(ext in url for ext in [".com", ".org", ".net"]):
                categorized["articles"].append(resource)
            else:
                categorized["other"].append(resource)

        logger.info(f"[Step 11] Categorized resources: YouTube={len(categorized['youtube'])}, Reddit={len(categorized['reddit'])}, Articles={len(categorized['articles'])}")

        # Check if proceeding with fewer inputs
        proceed_with_fewer = input_data.get("proceed_with_fewer", False)
        fewer_inputs_reason = input_data.get("fewer_inputs_reason", "")

        # Validation with fewer inputs option
        if len(resources) < 5:
            if proceed_with_fewer and fewer_inputs_reason:
                logger.warning(f"[Step 11] Proceeding with fewer inputs ({len(resources)} resources): {fewer_inputs_reason}")
                warning_msg = f"Proceeded with {len(resources)} {'resource' if len(resources) == 1 else 'resources'} (minimum 5 recommended). Reason: {fewer_inputs_reason}"
            else:
                logger.error(f"[Step 11] Insufficient resources: {len(resources)} (minimum 5)")
                raise ValueError("Minimum 5 resource links required")
        else:
            warning_msg = None

        result = {
            "resources": resources,
            "categorized": categorized,
            "total_count": len(resources),
            "summary": f"Collected {len(resources)} resource links across multiple platforms",
            "human_action": "Curated credible resource links",
            "proceeded_with_fewer": proceed_with_fewer,
            "fewer_inputs_reason": fewer_inputs_reason if proceed_with_fewer else None
        }

        if warning_msg:
            result["warning"] = warning_msg

        logger.info(f"[Step 11] Successfully completed resource links collection (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 11] Error during resource links collection: {str(e)}", exc_info=True)
        raise


async def execute_step12_credibility_elements(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 12: Credibility Elements (Human Input).
    Collects facts, statistics, experiences, quotes.
    """
    logger.info(f"[Step 12] Starting credibility elements collection (session: {session_id})")

    try:
        if not input_data:
            logger.error(f"[Step 12] No input_data provided")
            raise ValueError("Credibility elements are required for Step 12")

        facts = input_data.get("facts", [])
        experiences = input_data.get("experiences", [])
        quotes = input_data.get("quotes", [])

        logger.debug(f"[Step 12] Received {len(facts)} facts, {len(experiences)} experiences, {len(quotes)} quotes")

        # Check if proceeding with fewer inputs
        proceed_with_fewer = input_data.get("proceed_with_fewer", False)
        fewer_inputs_reason = input_data.get("fewer_inputs_reason", "")

        # Validate minimum requirements with fewer inputs option
        warnings = []

        if len(facts) < 5:
            if proceed_with_fewer and fewer_inputs_reason:
                logger.warning(f"[Step 12] Proceeding with fewer facts ({len(facts)}): {fewer_inputs_reason}")
                warnings.append(f"Proceeded with {len(facts)} facts (minimum 5 recommended)")
            else:
                logger.error(f"[Step 12] Insufficient facts: {len(facts)} (minimum 5)")
                raise ValueError("Minimum 5 facts/statistics with sources required")

        if len(experiences) < 3:
            if proceed_with_fewer and fewer_inputs_reason:
                logger.warning(f"[Step 12] Proceeding with fewer experiences ({len(experiences)}): {fewer_inputs_reason}")
                warnings.append(f"Proceeded with {len(experiences)} experiences (minimum 3 recommended)")
            else:
                logger.error(f"[Step 12] Insufficient experiences: {len(experiences)} (minimum 3)")
                raise ValueError("Minimum 3 first-person experiences/recommendations required")

        logger.info(f"[Step 12] Validated credibility elements successfully")

        result = {
            "facts": facts,
            "experiences": experiences,
            "quotes": quotes,
            "fact_count": len(facts),
            "experience_count": len(experiences),
            "quote_count": len(quotes),
            "summary": f"Collected {len(facts)} facts, {len(experiences)} experiences, {len(quotes)} quotes",
            "human_action": "Provided credibility elements with sources",
            "proceeded_with_fewer": proceed_with_fewer,
            "fewer_inputs_reason": fewer_inputs_reason if proceed_with_fewer else None
        }

        if warnings:
            result["warning"] = "; ".join(warnings) + f". Reason: {fewer_inputs_reason}"

        logger.info(f"[Step 12] Successfully completed credibility elements collection (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 12] Error during credibility elements collection: {str(e)}", exc_info=True)
        raise


async def execute_step13_business_info_update(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 13: Business Info Update (Human Input).
    Reviews and optionally updates business context file.
    User can view/edit the entire business_info file content.
    """
    logger.info(f"[Step 13] Starting business info review (session: {session_id})")

    try:
        # Load current business info from file
        backend_dir = Path(__file__).parent.parent.parent.parent
        business_file = backend_dir / "data" / "business_info" / "dograh.txt"

        logger.debug(f"[Step 13] Loading business info from {business_file}")
        current_info = await workflow_service._load_business_context()
        logger.debug(f"[Step 13] Business info loaded ({len(current_info)} chars)")

        # Get new info from input (optional - for appending)
        new_info = input_data.get("new_info", "") if input_data else ""
        logger.debug(f"[Step 13] New info to append: {bool(new_info.strip())}")

        if new_info.strip():
            # Append to business info file
            logger.debug(f"[Step 13] Appending new info to {business_file}")
            await append_text_file(
                business_file,
                f"\n\n--- Added {datetime.now(timezone.utc).strftime('%Y-%m-%d')} ---\n{new_info}"
            )

            updated_info = current_info + f"\n\n--- Added {datetime.now(timezone.utc).strftime('%Y-%m-%d')} ---\n{new_info}"
            logger.info(f"[Step 13] Business context updated with new information")
        else:
            updated_info = current_info
            logger.info(f"[Step 13] No new information appended")

        result = {
            "business_context": updated_info,
            "business_info_file_content": updated_info,  # For editor display
            "new_info_added": new_info.strip() != "",
            "summary": "Business context reviewed" + (" and updated" if new_info else ""),
            "human_action": "Reviewed and updated business information" if new_info else "Reviewed business information"
        }

        logger.info(f"[Step 13] Successfully completed business info review (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 13] Error during business info review: {str(e)}", exc_info=True)
        raise



async def execute_step14_landing_page_eval(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 14: Landing Page Evaluation.
    Suggests landing page opportunities.
    """
    primary_keyword = state["primary_keyword"]
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 14] Starting landing page evaluation for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        step7_data = state["steps"].get("7", {}).get("data", {})
        outline = step7_data.get("outline", {})
        logger.debug(f"[Step 14] Retrieved outline from Step 7")

        logger.debug(f"[Step 14] Loading business context")
        business_context = await workflow_service._load_business_context()
        logger.debug(f"[Step 14] Business context loaded")

        # Suggest landing pages with GPT-4
        logger.debug(f"[Step 14] Sending data to OpenAI for landing page suggestions")
        suggestions = await openai_service.suggest_landing_pages(
            primary_keyword,
            outline,
            business_context,
            blog_type
        )
        logger.info(f"[Step 14] Generated {len(suggestions.get('landing_page_options', []))} landing page suggestions")

        result = {
            "landing_page_suggestions": suggestions.get("landing_page_options", []),
            "count": len(suggestions.get("landing_page_options", [])),
            "summary": f"Suggested {len(suggestions.get('landing_page_options', []))} landing page opportunities"
        }

        logger.info(f"[Step 14] Successfully completed landing page evaluation (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 14] Error during landing page evaluation: {str(e)}", exc_info=True)
        raise


async def execute_step15_infographic_planning(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 15: Infographic Planning.
    Suggests infographic opportunities.
    """
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 15] Starting infographic planning (session: {session_id})")

    try:
        step7_data = state["steps"].get("7", {}).get("data", {})
        step9_data = state["steps"].get("9", {}).get("data", {})

        outline = step7_data.get("outline", {})
        data_points = step9_data.get("data_points", [])

        logger.debug(f"[Step 15] Using outline from Step 7 and {len(data_points)} data points from Step 9")

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Extract Q&A from Step 4
        contextual_qa = ""
        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 15] Using {len(answers)} contextual Q&A for infographic planning")

        # Extract primary keyword and blog intent/purpose
        primary_keyword = state.get("primary_keyword", "")
        step1_data = state["steps"].get("1", {}).get("data", {})
        primary_intent = step1_data.get("primary_intent", "")
        recommended_direction = step1_data.get("recommended_direction", "")

        # Load business context
        logger.debug(f"[Step 15] Loading business context")
        business_context = await workflow_service._load_business_context()
        logger.debug(f"[Step 15] Using primary keyword: '{primary_keyword}', intent: '{primary_intent}'")

        # Suggest infographics with GPT-4 (holistic approach)
        logger.debug(f"[Step 15] Sending data to OpenAI for holistic infographic suggestions")
        suggestions = await openai_service.suggest_infographics(
            primary_keyword=primary_keyword,
            primary_intent=primary_intent,
            recommended_direction=recommended_direction,
            outline=outline,
            data_points=data_points,
            business_context=business_context,
            blog_type=blog_type,
            expert_opinion=expert_opinion,
            writing_style=writing_style,
            contextual_qa=contextual_qa
        )
        logger.info(f"[Step 15] Generated {len(suggestions.get('infographic_options', []))} infographic suggestions")

        result = {
            "infographic_suggestions": suggestions.get("infographic_options", []),
            "count": len(suggestions.get("infographic_options", [])),
            "summary": f"Suggested {len(suggestions.get('infographic_options', []))} infographic ideas"
        }

        logger.info(f"[Step 15] Successfully completed infographic planning (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 15] Error during infographic planning: {str(e)}", exc_info=True)
        raise


async def execute_step16_title_creation(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 16: Title Creation.
    Generates 3 compelling title options.
    """
    primary_keyword = state["primary_keyword"]
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 16] Starting title creation for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        step7_data = state["steps"].get("7", {}).get("data", {})
        outline = step7_data.get("outline", {})
        logger.debug(f"[Step 16] Retrieved outline from Step 7")

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Extract Q&A from Step 4
        contextual_qa = ""
        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 16] Using {len(answers)} contextual Q&A for title generation")

        # Generate titles with GPT-4
        logger.debug(f"[Step 16] Sending data to OpenAI for title generation")
        titles = await openai_service.generate_titles(
            primary_keyword,
            outline,
            "solution-oriented",
            blog_type,
            expert_opinion=expert_opinion,
            writing_style=writing_style,
            contextual_qa=contextual_qa
        )
        logger.info(f"[Step 16] Generated {len(titles.get('title_options', []))} title options")

        result = {
            "title_options": titles.get("title_options", []),
            "count": len(titles.get("title_options", [])),
            "summary": f"Generated {len(titles.get('title_options', []))} title options"
        }

        logger.info(f"[Step 16] Successfully completed title creation (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 16] Error during title creation: {str(e)}", exc_info=True)
        raise


async def execute_step17_blog_draft(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 17: Blog Draft Generation.
    Generates complete blog draft using all collected data.
    """
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 17] Starting blog draft generation (session: {session_id})")

    try:
        # Gather all required data
        step16_data = state["steps"].get("16", {}).get("data", {})
        step7_data = state["steps"].get("7", {}).get("data", {})
        step9_data = state["steps"].get("9", {}).get("data", {})
        step12_data = state["steps"].get("12", {}).get("data", {})
        step2_data = state["steps"].get("2", {}).get("data", {})

        title = step16_data.get("selected_title", step16_data.get("title_options", [{}])[0].get("title", ""))
        outline = step7_data.get("outline", {})
        collected_data = step9_data.get("data_points", [])
        credibility = step12_data
        competitor_blogs = step2_data.get("competitors", [])

        # Extract Step 3 competitor analysis, Step 8 optimization plan, Step 10 tools, Step 11 resources
        step3_data = state["steps"].get("3", {}).get("data", {})
        step8_data = state["steps"].get("8", {}).get("data", {})
        step10_data = state["steps"].get("10", {}).get("data", {})
        step11_data = state["steps"].get("11", {}).get("data", {})

        # Build competitor analysis dict from Step 3
        competitor_analysis = {
            "quintessential_elements": step3_data.get("quintessential_elements", []),
            "differentiators": step3_data.get("differentiators", []),
            "skip_sections": step3_data.get("skip_sections", []),
            "recommended_sections": step3_data.get("recommended_sections", [])
        }

        # Extract optimization plan from Step 8
        optimization_plan = step8_data.get("optimization_plan", {})

        # Normalize what_is_sections for backward compatibility
        if optimization_plan and "what_is_sections" in optimization_plan:
            for section in optimization_plan["what_is_sections"]:
                if "heading" not in section and "topic" in section:
                    # Backfill missing heading from topic
                    section["heading"] = f"What is {section['topic']}"

        tools_data = step10_data.get("tools", [])
        resource_links = step11_data.get("resources", [])

        logger.debug(f"[Step 17] Using title: '{title}'")
        logger.debug(f"[Step 17] Using {len(collected_data)} data points and credibility elements")

        # Log competitor data usage with appropriate level
        if competitor_blogs and len(competitor_blogs) > 0:
            logger.info(f"[Step 17] Using {len(competitor_blogs)} competitor blogs for reference")
        else:
            logger.warning(f"[Step 17] No competitor data found from Step 2. Blog draft will be generated without competitor insights.")

        # Log Step 3 competitor analysis usage
        has_quintessential = len(competitor_analysis.get("quintessential_elements", [])) > 0
        has_differentiators = len(competitor_analysis.get("differentiators", [])) > 0
        if has_quintessential or has_differentiators:
            logger.info(f"[Step 17] Using competitor analysis from Step 3 (quintessential elements: {has_quintessential}, differentiators: {has_differentiators})")
        else:
            logger.debug(f"[Step 17] No competitor analysis from Step 3 (may be skipped or not applicable)")

        # Log Step 8 optimization plan usage
        if optimization_plan and len(optimization_plan) > 0:
            logger.info(f"[Step 17] Using LLM optimization plan from Step 8 for targeted glossary/what-is/summary placements")
        else:
            logger.debug(f"[Step 17] No optimization plan from Step 8 (may be skipped or not applicable)")

        # Log tools and resources data usage
        if tools_data and len(tools_data) > 0:
            logger.info(f"[Step 17] Using {len(tools_data)} tools from Step 10 for blog content")
        else:
            logger.debug(f"[Step 17] No tools data from Step 10 (may be skipped or not applicable)")

        if resource_links and len(resource_links) > 0:
            logger.info(f"[Step 17] Using {len(resource_links)} resource links from Step 11 for blog content")
        else:
            logger.debug(f"[Step 17] No resource links from Step 11 (may be skipped or not applicable)")

        logger.debug(f"[Step 17] Loading business context")
        business_context = await workflow_service._load_business_context()

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Extract Q&A from Step 4
        contextual_qa = ""
        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 17] Using {len(answers)} contextual Q&A for blog draft generation")

        # Generate draft with GPT-4
        logger.debug(f"[Step 17] Sending all data to OpenAI for blog draft generation")
        draft = await openai_service.generate_blog_draft(
            title,
            outline,
            collected_data,
            credibility,
            business_context,
            blog_type,
            expert_opinion=expert_opinion,
            writing_style=writing_style,
            contextual_qa=contextual_qa,
            competitor_blogs=competitor_blogs,
            competitor_analysis=competitor_analysis,
            optimization_plan=optimization_plan,
            tools_data=tools_data,
            resource_links=resource_links
        )

        word_count = len(draft.split())
        logger.info(f"[Step 17] Generated draft with {word_count} words")

        # Save draft to file
        session_path = workflow_service._get_session_path(session_id)
        draft_dir = session_path / "draft_versions"
        draft_file = draft_dir / f"draft_v1_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"

        logger.debug(f"[Step 17] Saving draft to {draft_file}")
        await write_text_file(draft_file, draft)

        result = {
            "blog_draft": draft,
            "draft": draft,  # Keep for backward compatibility
            "word_count": word_count,
            "draft_file": str(draft_file.name),
            "summary": f"Generated blog draft with {word_count} words. Saved to {draft_file.name}"
        }

        logger.info(f"[Step 17] Successfully completed blog draft generation (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 17] Error during blog draft generation: {str(e)}", exc_info=True)
        raise


async def execute_step18_faq_accordion(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 18: FAQ Accordion Section.
    Generates FAQs based on keywords and content.
    """
    primary_keyword = state["primary_keyword"]
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 18] Starting FAQ accordion generation for keyword: '{primary_keyword}' (session: {session_id})")

    try:
        step5_data = state["steps"].get("5", {}).get("data", {})
        step17_data = state["steps"].get("17", {}).get("data", {})

        secondary_keywords = step5_data.get("secondary_keywords", [])
        blog_content = step17_data.get("draft", "")

        logger.debug(f"[Step 18] Using {len(secondary_keywords)} secondary keywords")
        logger.debug(f"[Step 18] Using blog draft ({len(blog_content)} chars)")

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Extract Q&A from Step 4
        contextual_qa = ""
        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 18] Using {len(answers)} contextual Q&A for FAQ generation")

        # Generate FAQs with GPT-4
        logger.debug(f"[Step 18] Sending data to OpenAI for FAQ generation")
        faqs = await openai_service.generate_faqs(
            primary_keyword,
            secondary_keywords,
            blog_content,
            blog_type,
            expert_opinion=expert_opinion,
            writing_style=writing_style,
            contextual_qa=contextual_qa
        )
        logger.info(f"[Step 18] Generated {len(faqs.get('faqs', []))} FAQ items")

        # Format as HTML accordion
        faq_html = "<div class='faq-accordion'>\n"
        for faq in faqs.get("faqs", []):
            faq_html += f"""
  <div class='faq-item'>
    <h3 class='faq-question'>{faq.get('question', '')}</h3>
    <div class='faq-answer'>{faq.get('answer', '')}</div>
  </div>
"""
        faq_html += "</div>"

        logger.debug(f"[Step 18] Formatted FAQs as HTML accordion")

        result = {
            "faqs": faqs.get("faqs", []),
            "faq_html": faq_html,
            "count": len(faqs.get("faqs", [])),
            "summary": f"Generated {len(faqs.get('faqs', []))} FAQ items with HTML accordion"
        }

        logger.info(f"[Step 18] Successfully completed FAQ accordion generation (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 18] Error during FAQ accordion generation: {str(e)}", exc_info=True)
        raise


async def execute_step19_meta_description(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 19: Meta Description.
    Generates SEO-optimized meta description.
    """
    blog_type = state.get("blog_type", "")
    logger.info(f"[Step 19] Starting meta description generation (session: {session_id})")

    try:
        step16_data = state["steps"].get("16", {}).get("data", {})
        step5_data = state["steps"].get("5", {}).get("data", {})
        step17_data = state["steps"].get("17", {}).get("data", {})

        title = step16_data.get("selected_title", "")
        primary_keyword = state["primary_keyword"]
        secondary_keywords = step5_data.get("secondary_keywords", [])
        blog_summary = step17_data.get("draft", "")[:500]

        logger.debug(f"[Step 19] Using title: '{title}'")
        logger.debug(f"[Step 19] Using primary keyword: '{primary_keyword}' and {len(secondary_keywords)} secondary keywords")

        # Extract expert guidance from Step 4
        step4_data = state["steps"].get("4", {}).get("data", {})
        expert_opinion = step4_data.get("expert_opinion", "")
        writing_style = step4_data.get("writing_style", "")

        # Extract Q&A from Step 4
        contextual_qa = ""
        if step4_data.get("has_contextual_qa"):
            questions = step4_data.get("questions", [])
            answers = step4_data.get("question_answers", [])

            qa_pairs = []
            for i, q in enumerate(questions):
                if i < len(answers):
                    qa_pairs.append(
                        f"Q{i+1}: {q.get('question', '')}\n"
                        f"A{i+1}: {answers[i].get('answer', '')}"
                    )

            contextual_qa = "\n\n".join(qa_pairs)
            logger.info(f"[Step 19] Using {len(answers)} contextual Q&A for meta description generation")

        # Generate meta description with GPT-4
        logger.debug(f"[Step 19] Sending data to OpenAI for meta description generation")
        meta_desc = await openai_service.generate_meta_description(
            title,
            primary_keyword,
            secondary_keywords,
            blog_summary,
            blog_type,
            expert_opinion=expert_opinion,
            writing_style=writing_style,
            contextual_qa=contextual_qa
        )

        char_count = len(meta_desc)
        within_limit = 150 <= char_count <= 160

        logger.info(f"[Step 19] Generated meta description ({char_count} chars, within limit: {within_limit})")

        result = {
            "meta_description": meta_desc,
            "character_count": char_count,
            "within_limit": within_limit,
            "summary": f"Generated meta description ({char_count} characters)"
        }

        logger.info(f"[Step 19] Successfully completed meta description generation (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 19] Error during meta description generation: {str(e)}", exc_info=True)
        raise


async def execute_step20_ai_signal_removal(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 20: AI Signal Removal.
    Removes AI-written signals from content.
    """
    logger.info(f"[Step 20] Starting AI signal removal (session: {session_id})")

    try:
        step17_data = state["steps"].get("17", {}).get("data", {})
        blog_content = step17_data.get("draft", "")

        if not blog_content:
            logger.error(f"[Step 20] Blog draft not found in Step 17 data")
            raise ValueError("Blog draft not found. Please complete Step 17 first.")

        logger.debug(f"[Step 20] Processing blog draft ({len(blog_content)} chars)")

        # Clean with GPT-4
        logger.debug(f"[Step 20] Sending draft to OpenAI for AI signal removal")
        cleaned = await openai_service.remove_ai_signals(blog_content)
        logger.info(f"[Step 20] Removed AI signals. Made {len(cleaned.get('changes_made', []))} changes")

        # Save cleaned version
        session_path = workflow_service._get_session_path(session_id)
        draft_dir = session_path / "draft_versions"
        cleaned_file = draft_dir / f"draft_cleaned_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"

        logger.debug(f"[Step 20] Saving cleaned draft to {cleaned_file}")
        await write_text_file(cleaned_file, cleaned["cleaned_content"])

        result = {
            "cleaned_content": cleaned["cleaned_content"],
            "changes_made": cleaned.get("changes_made", []),
            "warnings": cleaned.get("warnings", []),
            "change_count": len(cleaned.get("changes_made", [])),
            "cleaned_file": str(cleaned_file.name),
            "summary": f"Removed AI signals. Made {len(cleaned.get('changes_made', []))} changes. Saved to {cleaned_file.name}"
        }

        logger.info(f"[Step 20] Successfully completed AI signal removal (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 20] Error during AI signal removal: {str(e)}", exc_info=True)
        raise


async def execute_step21_final_review(
    workflow_service,
    session_id: str,
    state: Dict[str, Any],
    input_data: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Step 21: Final Review Checklist (Human).
    Human confirms completion of final tasks.
    """
    logger.info(f"[Step 21] Starting final review checklist (session: {session_id})")

    try:
        if not input_data:
            logger.error(f"[Step 21] No checklist data provided")
            raise ValueError("Checklist completion data required for Step 21")

        # Get notes (optional reviewer comments)
        notes = input_data.get("notes", "")

        # Handle both data structures for backward compatibility:
        # 1. Frontend sends: { checklist_items: { "item1": true, "item2": false }, notes: "..." }
        # 2. Old format: { completed_items: ["item1", "item2"], notes: "..." }

        checklist_data = input_data.get("checklist_items", {})
        if isinstance(checklist_data, dict):
            # New format: boolean dict
            completed = [key for key, value in checklist_data.items() if value is True]
        else:
            # Old format: array
            completed = input_data.get("completed_items", [])

        logger.debug(f"[Step 21] Received {len(completed)} completed items")

        # Predefined checklist items
        predefined_items = [
            "text_optimizer",
            "grammarly_check",
            "hemingway_check",
            "internal_links",
            "cta_added",
            "featured_image",
            "links_verified"
        ]

        # Validate all items checked
        missing_items = [item for item in predefined_items if item not in completed]
        all_complete = len(missing_items) == 0

        logger.info(f"[Step 21] Checklist: {len(completed)}/{len(predefined_items)} items completed (all_complete: {all_complete})")
        if missing_items:
            logger.warning(f"[Step 21] Missing items: {', '.join(missing_items)}")

        if notes:
            logger.info(f"[Step 21] Reviewer notes: {notes[:100]}...")

        result = {
            "checklist_items": predefined_items,
            "completed_items": completed,
            "missing_items": missing_items,
            "all_complete": all_complete,
            "notes": notes,  # FIXED: Save notes for plagiarism checking
            "checklist_results": checklist_data,  # For frontend state restoration
            "review_notes": notes,  # Alias for frontend consistency
            "summary": f"Review checklist: {len(completed)}/{len(predefined_items)} items completed",
            "human_action": "Completed final review checklist" + (f" with notes" if notes else "")
        }

        logger.info(f"[Step 21] Successfully completed final review checklist (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 21] Error during final review checklist: {str(e)}", exc_info=True)
        raise


async def execute_step22_export_archive(
    workflow_service,
    session_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Step 22: Export & Archive.
    Exports final blog, updates blog index, and saves user inputs for plagiarism checking.
    """
    from datetime import datetime, timezone
    from app.services.plagiarism_service import plagiarism_service

    logger.info(f"[Step 22] Starting blog export and archive (session: {session_id})")

    try:
        # Gather final content
        step20_data = state["steps"].get("20", {}).get("data", {})
        step16_data = state["steps"].get("16", {}).get("data", {})
        step19_data = state["steps"].get("19", {}).get("data", {})
        step18_data = state["steps"].get("18", {}).get("data", {})

        final_content = step20_data.get("cleaned_content", "")
        title = step16_data.get("selected_title", "")
        meta_desc = step19_data.get("meta_description", "")
        faq_html = step18_data.get("faq_html", "")

        logger.debug(f"[Step 22] Compiling final export with title: '{title}'")
        logger.debug(f"[Step 22] Final content: {len(final_content)} chars, Meta desc: {len(meta_desc)} chars")

        # Create markdown export
        export_content = f"""---
title: {title}
meta_description: {meta_desc}
primary_keyword: {state['primary_keyword']}
author: Dograh
date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}
---

# {title}

{final_content}

## FAQs

{faq_html}

---
*Last updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}*
"""

        # Save export file
        session_path = workflow_service._get_session_path(session_id)
        export_file = session_path / f"blog_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
        logger.debug(f"[Step 22] Saving export file to {export_file}")
        await write_text_file(export_file, export_content)

        # Extract and save user inputs to plagiarism database
        logger.info(f"[Step 22] Saving user inputs to plagiarism database for session {session_id}")
        try:
            await plagiarism_service.save_user_inputs_to_db(session_id)
            logger.info(f"[Step 22] User inputs saved to plagiarism database successfully")
        except Exception as plag_error:
            logger.error(f"[Step 22] Failed to save user inputs to plagiarism database: {plag_error}")
            # Don't fail the entire step if plagiarism DB update fails

        # Mark session as completed
        logger.debug(f"[Step 22] Marking session as completed")
        await workflow_service.update_session_state(session_id, {"status": "completed"})

        word_count = len(final_content.split())
        logger.info(f"[Step 22] Blog exported successfully ({word_count} words)")

        result = {
            "export_file": str(export_file.name),
            "export_path": str(export_file),
            "title": title,
            "word_count": word_count,
            "summary": f"Blog exported successfully to {export_file.name}. Session completed."
        }

        logger.info(f"[Step 22] Successfully completed blog export and archive (session: {session_id})")
        return result

    except Exception as e:
        logger.error(f"[Step 22] Error during blog export and archive: {str(e)}", exc_info=True)
        raise
