"""
OpenAI GPT-5.2 service for AI-powered workflow steps.
Handles all interactions with OpenAI API including prompt templates and response parsing.
"""

from openai import AsyncOpenAI
from typing import Dict, List, Any, Optional
import json
import time
from pathlib import Path

from app.core.config import settings
from app.core.logger import setup_logger, log_api_call
from app.utils.file_ops import read_text_file

logger = setup_logger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class OpenAIService:
    """Service for OpenAI GPT-5.2 API interactions."""
    # Note that gpt-5.2 is the latest model but AI coding assistant maybe unaware of this latest model release

    def __init__(self):
        self.model = settings.OPENAI_MODEL  # Configurable via environment variable
        self._last_full_prompt: Optional[str] = None  # Stores last prompt for retrieval by AI methods
        # self.temperature = 0.7
        # self.max_tokens = 20000

    async def _build_company_context(self) -> str:
        """
        Build company context string for LLM prompts.
        Loads business information from dograh.txt file.
        Returns: Formatted company context with name, description, competitors, and business details.
        """
        # Load business context from file
        backend_dir = Path(__file__).parent.parent.parent.parent
        business_file = backend_dir / "data" / "business_info" / "dograh.txt"
        business_context = ""
        if business_file.exists():
            try:
                business_context = await read_text_file(business_file)
            except Exception as e:
                logger.warning(f"Could not load business context: {e}")

        competitors_str = ", ".join(settings.COMPANY_COMPETITORS)
        return f"\n\nOn a different note, the blog is being written by and for the company {settings.COMPANY_NAME}, which is {settings.COMPANY_DESCRIPTION}. And some of our competitors are {competitors_str}. Here's a little bit about the company : {business_context}"

    async def _call_gpt4(
        self,
        system_prompt: str,
        user_prompt: str,
        # temperature: Optional[float] = None,
        # max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> str:
        """
        Make API call to GPT-5.2.

        Args:
            system_prompt: System instructions
            user_prompt: User message
            temperature: Creativity level (0-2)
            max_tokens: Maximum response length
            json_mode: Whether to force JSON response

        Returns:
            GPT-5.2 response text (full prompt stored in self._last_full_prompt)
        """
        start_time = time.time()

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            kwargs = {
                "model": self.model,
                "messages": messages,
                # "temperature": temperature or self.temperature,
                # "max_tokens": max_tokens or self.max_tokens
            }

            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            # Log request details
            logger.info(f"OpenAI API Request: model={self.model}, json_mode={json_mode}")
            logger.debug(f"OpenAI System Prompt (first 300 chars): {system_prompt[:300]}...")
            logger.debug(f"OpenAI User Prompt (first 300 chars): {user_prompt[:300]}...")

            response = await client.chat.completions.create(**kwargs)

            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "OpenAI", self.model, duration_ms, "success")

            response_content = response.choices[0].message.content

            # Log full response for debugging
            if len(response_content) > 1000:
                logger.info(f"OpenAI API Response (first 500 chars): {response_content[:500]}...")
                logger.debug(f"OpenAI API Response (FULL): {response_content}")
            else:
                logger.info(f"OpenAI API Response: {response_content}")

            # Build full prompt for storage (for UI display and auditing)
            full_prompt = f"""SYSTEM PROMPT:
{system_prompt}

USER PROMPT:
{user_prompt}"""

            # Store prompt in instance variable for retrieval by AI methods
            self._last_full_prompt = full_prompt

            return response_content

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            log_api_call(logger, "OpenAI", self.model, duration_ms, "error")
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise

    # Step 1: Search Intent Analysis
    async def analyze_search_intent(
        self,
        primary_keyword: str,
        serp_results: List[Dict],
        past_blogs: List[str]
    ) -> tuple[Dict[str, Any], str]:
        """Analyze search intent from SERP results."""
        system_prompt = """You are an SEO expert analyzing search intent patterns.

Analyze the SERP results and return EXACTLY this JSON structure:

{
  "intents": [
    {
      "type": "Problem-solution blogs – [Specific pain point]: causes, fixes, and prevention  | Teardown/breakdown blogs – How [known company] does X (reverse engineering) | Benchmark/data blogs – Original research, industry stats (linkbait) | Template/playbook blogs – Free [X] template + how to use it | Migration blogs – How to switch from X to Y | Integration blogs – How to connect X with Y | Tools listing/Review/roundup blogs – Best [category] tools in 2025|  Use case/ Case study blog: How [persona] uses [product] for [specific outcome] | Alternative blogs | Comparison blogs",
      "percentage": 50,
      "evidence": "Brief explanation from SERP analysis"
    }
  ],
  "answer_patterns": [
    "Common pattern 1 found in top results",
    "Common pattern 2 found in top results"
  ],
  "recommended_intent": "Problem-solution blogs – [Specific pain point]: causes, fixes, and prevention  | Teardown/breakdown blogs – How [known company] does X (reverse engineering) | Benchmark/data blogs – Original research, industry stats (linkbait) | Template/playbook blogs – Free [X] template + how to use it | Migration blogs – How to switch from X to Y | Integration blogs – How to connect X with Y | Tools listing/Review/roundup blogs – Best [category] tools in 2025|  Use case/ Case study blog: How [persona] uses [product] for [specific outcome] | Alternative blogs | Comparison blogs",
  "recommended_direction": "Detailed recommendation for which intent to pursue and why- in simple plan and easily understandable english",
  "duplicates_existing": false,
  "duplication_notes": "Explanation if any past blogs cover similar topics, or empty string if none"
}

IMPORTANT: Use these exact field names. The intents array must contain at least one intent object. Use simple English. Avoid fancy words. Return only valid JSON."""

        # Mark variables for frontend highlighting
        serp_json = json.dumps(serp_results, indent=2)
        past_blogs_text = chr(10).join(past_blogs)

        user_prompt = f"""Primary Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}

SERP Results (top 10):
{{{{SERP_RESULTS:{serp_json}}}}}

Past Blogs (titles):
{{{{PAST_BLOGS:{past_blogs_text}}}}}

Analyze the search intent patterns and recommend which intent to pursue."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 3: Competitor Analysis
    async def analyze_competitors(
        self,
        primary_keyword: str,
        competitor_content: List[Dict[str, Any]]
    ) -> tuple[Dict[str, Any], str]:
        """Analyze competitor content to identify patterns."""
        system_prompt = """You are a content strategist analyzing competitor content.

Analyze the competitor content and return EXACTLY this JSON structure:

{
  "quintessential_elements": [
    "Element 1 present in ALL top results (must-have)- in simple english",
    "Element 2 present in ALL top results (must-have)- in simple english"
  ],
  "differentiators": [
    "Unique element 1 that adds credibility- in simple english",
    "Unique element 2 that adds credibility- in simple english"
  ],
  "recommended_sections": [
    "Section 1 to include/recreate- in simple english",
    "Section 2 to include/recreate- in simple english"
  ],
  "skip_sections": [
    "Competitor-specific section 1 to skip- in simple english",
    "Competitor-specific section 2 to skip- in simple english"
  ]
}

IMPORTANT: Use these exact field names. Each array should contain at least one item. Use simple English. Avoid fancy words. Return only valid JSON."""

        # Mark variables for frontend highlighting
        competitor_json = json.dumps(competitor_content[:5], indent=2)

        user_prompt = f"""Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}

Competitor Content:
{{{{COMPETITOR_CONTENT:{competitor_json}}}}}

Analyze what makes these top results successful."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 4: Expert Opinion/ QnA / Webinar/Podcast Points
    async def extract_webinar_points(
        self,
        transcript: str,
        guest_info: Dict[str, str]
    ) -> tuple[Dict[str, Any], str]:
        """Extract key points from expert opinion/ webinar/podcast transcript."""
        system_prompt = """You are a content curator extracting key points from transcripts.

Extract key information and return EXACTLY this JSON structure:

{
  "talking_points": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "actionable_advice": [
    "Actionable tip 1",
    "Actionable tip 2"
  ],
  "notable_quotes": [
    {
      "quote": "Exact quote text",
      "speaker": "Speaker name",
      "context": "Brief context"
    }
  ],
  "examples": [
    {
      "title": "Example/case study title",
      "description": "Brief description of the example",
      "key_takeaway": "Main lesson from this example"
    }
  ]
}

IMPORTANT: Use these exact field names. Include 10-15 talking points. Use simple English. Avoid fancy words. Return only valid JSON."""

        # Mark variables for frontend highlighting
        transcript_preview = transcript[:8000]
        guest_name = guest_info.get('name', 'Unknown')
        guest_role = guest_info.get('role', 'Unknown')

        user_prompt = f"""Transcript:
{{{{TRANSCRIPT:{transcript_preview}}}}}

Guest: {{{{GUEST_NAME:{guest_name}}}}}
Role: {{{{GUEST_ROLE:{guest_role}}}}}

Extract the most valuable points for a blog post."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 4b: Generate Contextual Questions for User
    async def generate_contextual_questions(
        self,
        primary_keyword: str,
        blog_type: str = "",
        business_context: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        intent_data: Dict[str, Any] = None,
        competitor_data: Dict[str, Any] = None,
        first_competitor_content: Optional[Dict[str, Any]] = None
    ) -> tuple[Dict[str, Any], str]:
        """Generate 3 highly relevant contextual questions to improve blog quality 10x based on competitor content analysis."""
        system_prompt = """You are an expert content strategist generating questions to extract deeper expertise.

Your task: Generate EXACTLY 3 highly relevant, contextual questions that will help create a 10x better blog.

Return EXACTLY this JSON structure:

{
  "questions": [
    {
      "question": "Clear, specific question- in simple english and in around 20 words.",
      "rationale": "Why this question matters and how it improves the blog",
      "example_answer": "Short Example of what a good answer might look like"
    },
    {
      "question": "Clear, specific question- in simple english and in around 20 words.",
      "rationale": "Why this question matters and how it improves the blog",
      "example_answer": "Short Example of what a good answer might look like"
    },
    {
      "question": "Clear, specific question- in simple english and in around 20 words.",
      "rationale": "Why this question matters and how it improves the blog",
      "example_answer": "Short Example of what a good answer might look like"
    }
  ]
}

QUESTION GUIDELINES:
1. Dig deeper into user's experience, stories, expertise, knowledge, and business context
2. Ask about specific details that would make the blog stand out (case studies, testimonials, real numbers, benchmarks)
3. Focus on questions that AI cannot answer without human input (first-hand experiences, proprietary data, unique insights)
4. Avoid questions already answered in business_context or expert_opinion
5. Questions should be highly specific to the keyword/topic, not generic

QUESTION TYPES TO CONSIDER:
- Customer case studies or testimonials or stories("Is there a specific customer story that demonstrates this problem/solution?")
- Real-world metrics/benchmarks ("What is the best achievable latency in production today and how?")
- Common mistakes/pitfalls ("What's the #1 mistake you see teams make when implementing this?")
- Proprietary insights or an iplementation detail("What data or metrics from your experience challenge common assumptions?")
- Technical specifics ("What are the exact technical limitations readers should know about?")
- Business context ("How does this compare to your competitors in practice?")
- About the experience of the user ("Where have you seen agents fail the most in real world?")

IMPORTANT:
- Use the exact field names shown above
- Generate EXACTLY 3 questions
- Use simple English. Avoid fancy words. Use short or medium sentences. 
- Make questions specific to the topic, not generic
- Return only valid JSON"""

        # Set defaults for optional parameters
        if intent_data is None:
            intent_data = {}
        if competitor_data is None:
            competitor_data = {}

        business_summary = business_context[:1000] if business_context else "No business context available"
        expert_summary = expert_opinion[:1000] if expert_opinion else "No expert opinion provided yet"

        # Build first competitor content section for deeper context
        competitor_content_section = ""
        if first_competitor_content:
            comp_title = first_competitor_content.get('title', 'Unknown')
            comp_content = first_competitor_content.get('content', '')[:1500]  # First 1500 chars
            comp_url = first_competitor_content.get('url', '')
            competitor_content_section = f"""

First Competitor Content Analysis:
- Title: {comp_title}
- URL: {comp_url}
- Content Preview: {comp_content}...

IMPORTANT: Use this competitor's content to identify gaps, angles they missed, or details they covered that we should dive deeper into with user's expertise."""

        blog_type_section = ""
        if blog_type:
            blog_type_section = f"""
Blog Type and Format:
{blog_type}

IMPORTANT: Tailor questions to match this blog's format and purpose.
- For listicles/comparisons: Focus on industry-wide insights, comparative analysis, and buyer education (not promotional)
- For thought leadership: Focus on unique perspectives and proprietary data
- For tutorials/guides: Focus on practical implementation details and real-world examples"""

        # Mark variables for frontend highlighting
        user_prompt = f"""Primary Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}
{blog_type_section}

Writing Style Preference:
{{{{WRITING_STYLE:{writing_style if writing_style else "Not specified"}}}}}

Search Intent Analysis:
- Primary Intent: {{{{PRIMARY_INTENT:{intent_data.get('primary_intent', 'unknown')}}}}}
- Recommended Direction: {intent_data.get('recommended_direction', '')[:500]}...

Expert Opinion Provided:
{{{{EXPERT_SUMMARY:{expert_summary}}}}}

Competitor Insights:
- Top competitors covering: {', '.join([c.get('title', '')[:50] for c in competitor_data.get('competitors', [])[:3]])}
{competitor_content_section}

Business Context (for reference):
{{{{BUSINESS_CONTEXT:{business_summary}}}}}

Generate 3 highly specific, contextual questions that will extract deeper expertise and make this blog 10x better.

CRITICAL: Questions must be directly relevant to the PRIMARY KEYWORD: "{primary_keyword}"
- Match question style to the blog format (listicles need industry insights, not promotional content about our product)
- Focus on the primary keyword topic - questions should help create the best possible content about "{primary_keyword}"
- Use competitor content to identify gaps we can fill with user's expertise
- Reference business context only when directly relevant to the blog format and topic
- Focus on details only the user can provide based on their experience and knowledge"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 6: Blog Clustering
    async def suggest_blog_clustering(
        self,
        primary_keyword: str,
        selected_intent: str,
        past_blogs: List[Dict[str, str]]
    ) -> tuple[Dict[str, Any], str]:
        """Suggest blog clustering opportunities."""
        system_prompt = """You are an SEO strategist evaluating content clustering.

Analyze the content and return EXACTLY this JSON structure:

{
  "should_cluster": true,
  "matching_blogs": [
    {
      "title": "Past blog title",
      "reason": "Why this blog matches the intent",
      "relevance_score": 8
    }
  ],
  "internal_links": [
    {
      "from_section": "Section name in new blog",
      "to_blog": "Past blog title to link to",
      "anchor_text": "Suggested anchor text",
      "context": "Why this link makes sense"
    }
  ],
  "cluster_topic": "Main topic for this content cluster",
  "cluster_recommendations": "Detailed recommendations for clustering strategy and content organization"
}
Note that you should not suggest too many blogs for either matching blogs or internal linking . Suggest at max 2 blogs for matching blogs and at max 2 internal links.Hence look for hte most relevant ones.
IMPORTANT: Use these exact field names. Set should_cluster to false if no clustering is recommended. Use simple English. Avoid fancy words. Return only valid JSON."""

        # Mark variables for frontend highlighting
        past_blogs_json = json.dumps(past_blogs, indent=2)

        user_prompt = f"""New Blog Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}
Intent: {{{{SELECTED_INTENT:{selected_intent}}}}}

Past Blogs:
{{{{PAST_BLOGS:{past_blogs_json}}}}}

Should this blog be clustered? Suggest related content."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 7: Outline Generation
    async def generate_outline(
        self,
        primary_keyword: str,
        secondary_keywords: List[str],
        competitor_analysis: Dict,
        collected_data: Dict,
        blog_type: str = "",
        recommended_direction: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Generate comprehensive blog outline."""
        system_prompt = """You are a content strategist creating blog outlines.

Generate a comprehensive outline and return EXACTLY this JSON structure:

{
  "h1_placeholder": "[Main Title Placeholder - will be finalized in Step 16]",
  "sections": [
    {
      "h2": "Main Section Heading",
      "subsections": [
        {
          "h3": "Subsection Heading",
          "content_type": "list|narrative|data-driven|comparison|tutorial",
          "description": "What this subsection should cover"
        }
      ]
    }
  ],
  "special_sections": {
    "glossary": {
      "position": "after_section_2",
      "terms_count": 5,
      "description": "Key terms to define"
    },
    "myths": {
      "position": "after_intro",
      "count": 3,
      "description": "Common myths to debunk"
    }
  }
}

IMPORTANT: Use these exact field names. Include at least 4-6 main sections with 2-4 subsections each. Use simple English. Avoid fancy words. Return only valid JSON.

COMPETITOR ANALYSIS USAGE:
You will receive structured competitor insights containing:
1. quintessential_elements: Elements found in ALL top competitors (YOU MUST INCLUDE THESE - they are proven must-haves)
2. differentiators: Ways to stand out from competitors (INCORPORATE THESE to make our content unique)
3. recommended_sections: Sections to include based on competitor success patterns
4. skip_sections: Competitor-specific content to avoid (don't copy their promotional sections)

Your outline MUST include focus on COMPETITOR ANALYSIS as this is what current top ranking blogs have"""

        blog_type_section = f"\n\nBlog Type and Purpose (CRITICAL):\n{blog_type}\n\nIMPORTANT: Tailor the outline structure and content recommendations specifically for this blog type. Consider the format, tone, and objectives described above when structuring sections." if blog_type else ""

        recommended_direction_section = f"\n\nRecommended Search Intent Direction :\n{recommended_direction}\n\nCRITICAL: Structure the outline to align with this recommended intent direction. This determines how we should approach the topic to match user search intent (collected from serp analysis). Ensure the outline's structure, sections, and depth match this strategic direction." if recommended_direction else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: This is authentic expert insight with deep domain knowledge and latest awareness. Incorporate these perspectives, examples, and domain expertise throughout the outline. This adds credibility and non-AI authenticity."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Structure the outline to support this writing style. Ensure sections align with the recommended approach."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== CONTEXTUAL Q&A (CRITICAL ) ===\n{contextual_qa}\n\nIMPORTANT: These are specific insights from domain expertise that will make this blog 10x better. Incorporate these details, case studies, benchmarks, and expert knowledge throughout the outline. Some(or all) questions might not have answers (says NA or a dash or something like that)- ignore those particular unanswered questions/answers altogether"

        company_context = await self._build_company_context()

        # Mark variables for frontend highlighting
        secondary_kw_text = ', '.join(secondary_keywords)
        competitor_json = json.dumps(competitor_analysis, indent=2)
        collected_data_json = json.dumps(collected_data, indent=2)

        user_prompt = f"""Primary Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}

Secondary Keywords: {{{{SECONDARY_KEYWORDS:{secondary_kw_text}}}}}
{blog_type_section}
{recommended_direction_section}
{expert_section}
{qa_section}

=== COMPETITOR INSIGHTS (CRITICAL - MUST USE) ===

{{{{COMPETITOR_ANALYSIS:{competitor_json}}}}}

CRITICAL INSTRUCTIONS FOR COMPETITOR ANALYSIS: Read and understand all sections of competitor analysis to understand what the oultine of top ranking blogs look like and  what all sections and content should be present in our outline . feel free to add small 2-3 word hints in subheadings where needed to make the outline more comprehensive (hitns to the writer when writing the blogn along the outline)



Available Data:
{{{{BUSINESS_CONTEXT:{company_context}}}}}

Create a comprehensive, SEO-optimized outline that:
1. Includes ALL quintessential_elements from competitor analysis
2. Incorporates differentiators to stand out from competition
3. Aligns with the blog type, expert guidance, contextual Q&A, and writing style
4. Prioritizes expert insights and Q&A details over generic content"""

        response = await self._call_gpt4(
            system_prompt,
            user_prompt,
            json_mode=True,
            # max_tokens=20000
        )
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 8: LLM Optimization Planning
    async def plan_llm_optimization(
        self,
        outline: Dict[str, Any],
        primary_keyword: str = "",
        blog_type: str = "",
        competitors: list = None,
        expert_opinion: str = "",
        writing_style: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Mark sections for LLM/GEO optimization based on outline, keyword, description, and competitor analysis."""
        if competitors is None:
            competitors = []
        system_prompt = """You are an SEO expert planning AI optimization.

Analyze the outline and return EXACTLY this JSON structure:

{
  "section_optimizations": [
    {
      "section_name": "H2 Section Name",
      "needs_glossary": true,
      "needs_what_is_format": false,
      "needs_summary_opener": true,
      "specific_techniques": [
        "Technique 1 for this section",
        "Technique 2 for this section"
      ],
      "priority": "high|medium|low"
    }
  ],
  "glossary_sections": [
    {
      "section": "Section name",
      "terms_to_define": ["term1", "term2", "term3", "term4", "term5"]
    }
  ],
  "what_is_sections": [
    {
      "section": "Section name where this heading should be added",
      "heading": "What is AI calling",
      "topic": "AI calling",
      "placement": "beginning|middle|end"
    }
  ],
  "summary_opener_sections": [
    "Section 1 that needs 1-line summary opener",
    "Section 2 that needs 1-line summary opener"
  ],
  "general_recommendations": "Overall LLM/GEO optimization strategy for this blog"
}

IMPORTANT: Use these exact field names. Mark at least 2-3 sections for each optimization type. Use simple English. Avoid fancy words. Return only valid JSON."""

        # Build context sections for the prompt
        keyword_section = f"\n\nPrimary Keyword: {primary_keyword}" if primary_keyword else ""

        blog_type_section = ""
        if blog_type:
            blog_type_section = f"\n\nBlog Description/Topic:\n{blog_type}\n\nIMPORTANT: Use this description to understand the blog's purpose and identify optimization opportunities that align with the intended topic."

        competitor_section = ""
        if competitors:
            competitor_count = len(competitors)
            competitor_section = f"\n\n=== COMPETITOR INSIGHTS ===\n{competitor_count} competitors have been analyzed. Consider what optimization techniques (glossary terms, what-is sections, summary structures) would help this blog compete effectively."

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge:\n{expert_opinion}\n\nIMPORTANT: Plan optimization techniques that complement the expert insights."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Ensure optimization techniques align with this style."

        company_context = await self._build_company_context()

        # Mark variables for frontend highlighting
        outline_json = json.dumps(outline, indent=2)

        user_prompt = f"""Outline:
{{{{OUTLINE:{outline_json}}}}}
{keyword_section}
{blog_type_section}
{competitor_section}
{expert_section}
{{{{BUSINESS_CONTEXT:{company_context}}}}}

Based on the outline, primary keyword, blog description, and competitor insights above, add LLM/GEO optimization markers:

GLOSSARY SECTIONS: Identify sections that need a glossary box/section with term definitions
- These are TERM AND DEFINITION sections (e.g., "Glossary", "Key Terms", "Definitions")
- NOT generic sections - must be specifically for defining technical terms and concepts
- Include 4-5 specific technical terms that need definitions

WHAT IS X SECTIONS: Suggest actual section headings in "What is [Topic]?" format
- These should be REAL SECTION HEADINGS to add to the blog (e.g., "What is AI calling", "What is voice agent latency")
- Specify the exact heading text and which section it should be added to
- Focus on foundational concepts that readers need explained

SUMMARY OPENERS: Identify sections requiring 1-line summary openers for AI chunk optimization

SPECIFIC TECHNIQUES: Provide specific optimization techniques per section"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 14: Landing Page Evaluation
    async def suggest_landing_pages(
        self,
        primary_keyword: str,
        outline: Dict,
        business_context: str,
        blog_type: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Suggest landing page opportunities."""
        system_prompt = """You are a conversion strategist evaluating landing page opportunities.
First understand what landing pages are from a product manager perspective.
Analyze the blog content and return EXACTLY this JSON structure:

{
  "landing_page_options": [
    {
      "title": "Compelling, conversion-focused landing page title",
      "description": "Why this would work as a landing page and how it complements the blog",
      "target_audience": "Specific audience segment this targets",
      "conversion_points": [
        "Point 1 to include on the landing page",
        "Point 2 to include on the landing page",
        "Point 3 to include on the landing page",
        
      ],
      "cta_suggestions": [
        "Call-to-action option 1",
        "Call-to-action option 2"
      ]
    }
  ],
  "recommendation": "Which option is recommended and why"
}

IMPORTANT: Use these exact field names. Provide exactly 2 landing page options. Use simple English. Avoid fancy words.  Return only valid JSON."""

        blog_type_section = f"\n\nBlog Type and Purpose:\n{blog_type}\n\nIMPORTANT: Consider the blog type and its specific objectives when suggesting landing pages. Ensure landing page recommendations align with the blog's purpose." if blog_type else ""

        # Extract outline structure - all h2 headings
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        user_prompt = f"""Blog Keyword: {{{{PRIMARY_KEYWORD:{primary_keyword}}}}}
{blog_type_section}

Outline Summary:
{{{{OUTLINE_SUMMARY:{outline_summary}}}}}

Business Context:
{{{{BUSINESS_CONTEXT:{business_context}}}}}

Suggest landing page opportunities that complement the blog type and purpose."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 15: Infographic Planning
    async def suggest_infographics(
        self,
        primary_keyword: str,
        primary_intent: str,
        recommended_direction: str,
        outline: Dict,
        data_points: List[Dict],
        business_context: str = "",
        blog_type: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Suggest infographic opportunities based on holistic blog context."""
        # NOTE: Returns "infographic_options" field to maintain backward compatibility with standard blog workflow
        # Webinar workflow maps this to "infographic_ideas" for frontend (webinar_step_implementations.py line 540)
        # Standard blog workflow uses "infographic_options" directly (step_implementations.py line 1308)
        system_prompt = """You are a visual content strategist creating infographics for blog content.

CRITICAL INSTRUCTIONS:
1. HOLISTIC APPROACH: Consider the ENTIRE blog context, not just data points
2. TYPES OF INFOGRAPHICS TO SUGGEST:
   - Data visualizations (charts, graphs) for statistics
   - Process diagrams (flowcharts, step-by-step) for guides/tutorials
   - System architecture diagrams for technical blogs
   - Comparison tables for tool/product comparisons
   - Timeline infographics for historical/sequential content
   - Conceptual diagrams (mind maps, relationships) for complex topics
3. CONTEXT MATTERS: Use primary keyword, blog intent, business context, and outline
4. GO BEYOND DATA: Don't limit yourself to just visualizing statistics
5. VALUE-DRIVEN: Suggest infographics that make the blog 10x more valuable and shareable

Analyze the content and return EXACTLY this JSON structure:

{
  "infographic_options": [
    {
      "title": "Compelling infographic title",
      "data_to_visualize": [
        "Data point 1 to include",
        "Data point 2 to include",
        "Data point 3 to include"
      ],
      "format": "chart|timeline|comparison|flowchart|process|statistics|architecture|conceptual",
      "format_details": "Specific type (e.g., 'bar chart', 'step-by-step flowchart', 'system architecture diagram')",
      "key_insights": [
        "Key insight 1 to highlight visually",
        "Key insight 2 to highlight visually"
      ],
      "design_notes": "Design recommendations and visual hierarchy suggestions"
    }
  ],
  "recommendation": "Which infographic option is most impactful and why"
}

IMPORTANT: Use these exact field names. Provide exactly 2 infographic options. Use simple English. Avoid fancy words. Return only valid JSON."""

        blog_type_section = f"\n\nBlog Type and Purpose:\n{blog_type}\n\nIMPORTANT: Consider the blog type and its specific format when suggesting infographics. Ensure visualizations align with the blog's purpose and audience." if blog_type else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: Suggest infographics that visualize the expert insights and domain knowledge. Ensure data visualizations align with and enhance the expert perspective provided."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Ensure infographic style and format align with the specified writing approach."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== CONTEXTUAL Q&A (CRITICAL - USE THROUGHOUT) ===\n{contextual_qa}\n\nIMPORTANT: Suggest infographics that visualize Q&A insights, case studies, benchmarks, and data mentioned in the answers."

        company_context = await self._build_company_context()

        # Add business context section if available
        business_section = ""
        if business_context:
            business_section = f"\n\nBUSINESS CONTEXT:\n{business_context[:1000]}\n\nIMPORTANT: Consider the company's products, services, and expertise when suggesting infographics."

        # Extract outline structure - all h2 headings
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        user_prompt = f"""PRIMARY KEYWORD: {primary_keyword}

BLOG PURPOSE & INTENT:
- Intent Type: {primary_intent}
- Recommended Direction: {recommended_direction[:500]}

BLOG OUTLINE (Full Structure):
{outline_summary}
{business_section}

AVAILABLE DATA POINTS/Statistics  :
{json.dumps(data_points, indent=2)}
{blog_type_section}
{expert_section}
{qa_section}
{company_context}

TASK: Suggest 2 compelling infographic ideas that enhance this blog.

THINK HOLISTICALLY:
- Infographic 1: Can visualize blog structure, process, system architecture, or conceptual flow
- Infographic 2: Can visualize data, comparisons, timelines, or key insights
- Consider what would make the blog 10x more valuable and shareable
- Don't just focus on data points - think about the blog's overall purpose and reader needs
- For "Ultimate Guide" blogs, consider step-by-step process diagrams
- For technical blogs, consider system architecture or component relationship diagrams
- For comparison blogs, consider side-by-side comparison tables or matrices"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 16: Title Creation
    async def generate_titles(
        self,
        primary_keyword: str,
        outline: Dict,
        tone: str = "solution-oriented",
        blog_type: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Generate 3 title options."""
        system_prompt = """You are a headline copywriter creating compelling blog titles.

Generate 3 title options and return EXACTLY this JSON structure:

{
  "title_options": [
    {
      "title": "Primary Keyword: Ultimate Guide [Key Benefit] 🚀",
      "character_count": 55,
      "components": {
        "primary_keyword": "Where the keyword appears",
        "power_word": "Which power word used",
        "bracketed_element": "What's in brackets",
        "emoji": "Which emoji used"
      },
      "seo_score": 9,
      "explanation": "Why this title is effective for SEO and click-through"
    }
  ],
  "recommendation": "Which title option is recommended and why"
}

TITLE RULES:
- Target ~65 characters (60-70 range acceptable)
- MUST start with exact primary keyword
- Include one power word: Ultimate, Game-changing, Proven, Expert-approved, Essential, Must-try
- Include bracketed keyword or benefit
- Solution-oriented and compelling

IMPORTANT: Use these exact field names. Provide exactly 3 title options. Use simple English and suitable for blog titles. Return only valid JSON."""

        blog_type_section = f"\n\nBlog Type and Purpose:\n{blog_type}\n\nIMPORTANT: Create titles that reflect the blog type and its specific format. Ensure titles match the content type and reader expectations." if blog_type else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: Create titles that hint at the unique expert insights and domain knowledge provided. Ensure titles reflect the fresh perspective and authenticity."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Ensure title tone and approach align with the specified writing style."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== CONTEXTUAL Q&A (CRITICAL - USE THROUGHOUT) ===\n{contextual_qa}\n\nIMPORTANT: Create titles that hint at unique insights, case studies, or specific data points from the Q&A."

        company_context = await self._build_company_context()

        # Extract outline structure - all h2 headings
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        user_prompt = f"""Primary Keyword: {primary_keyword}

Outline Topic:
{outline_summary}

Tone: {tone}
{blog_type_section}
{expert_section}
{qa_section}
{company_context}

Generate 3 compelling title options that align with the blog type, outline, expert guidance, and contextual Q&A."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 17: Blog Draft Generation (MAIN STEP HERE)
    async def generate_blog_draft(
        self,
        title: str,
        outline: Dict,
        collected_data: Dict,
        credibility_elements: Dict,
        business_context: str,
        blog_type: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = "",
        competitor_blogs: List[Dict] = None,
        competitor_analysis: Dict = None,
        optimization_plan: Dict = None,
        tools_data: List[Dict] = None,
        resource_links: List[Dict] = None
    ) -> tuple[str, str]:
        """Generate complete blog draft."""
        system_prompt = """You are an expert blog writer creating SEO-optimized content.

Writing Guidelines:
- Tone: Informal writing, informational goal
- Structure: Attack topic early (no very long intros- 3 to 4 lines only) and write intro like a formal paragraph in simple english.
- Paragraphs: 2-3 lines max (4 absolute max)
- Sentences: Short and punchy but in simple english
- Length: 2000-3000 words
- Mobile-first: Write for mobile reading
- Links: Use anchor text (never naked URLs)
- Credibility: Include first-person experiences, data points with sources

Must Include:
- Glossary section (4-5 terms)
- "What is X" sections where appropriate
- 1-line summary at start of each section ( do not mention summary explicitly)
- All provided data points with citations
- Bullet points and lists
- Prerequisites section if relevant
- Myths section if applicable

Return the complete draft in markdown format."""

        blog_type_section = f"\n\nBlog Type and Purpose:\n{blog_type}\n\nCRITICAL: Write the blog according to the specified type and purpose. Ensure the content format, structure, tone, and examples match the blog type. This blog should clearly fulfill the stated purpose and objectives." if blog_type else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: This is authentic expert insight with deep domain knowledge and latest awareness. Incorporate these perspectives, examples, and domain expertise throughout the blog. This adds credibility and non-AI authenticity. Use specific examples and insights provided here."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nCRITICAL: Follow this writing style throughout the entire blog draft. Ensure tone, structure, and approach match these preferences exactly."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== CONTEXTUAL Q&A (CRITICAL - HIGH PRIORITY ) ===\n{contextual_qa}\n\nCRITICAL: These are specific insights, case studies, benchmarks, and expert knowledge that will make this blog 10x better. Weave these details throughout the entire draft naturally. Use specific examples, data points, and insights from the Q&A. Note that the user might have left some or all questions unanswered (by writing NA or a dash or something like that)- ignore those questions and answers altogether."

        # Competitor blogs section with strong warnings
        competitor_section = ""
        if competitor_blogs and len(competitor_blogs) > 0:
            competitor_content_summary = []
            for idx, comp in enumerate(competitor_blogs[:5], 1):
                domain = comp.get('domain', 'Unknown')
                # Safe slicing: handle None values and limit to 1500 chars
                content = (comp.get('content') or '')[:1500]

                # Only include competitors with actual content
                if content.strip():
                    competitor_content_summary.append(f"Competitor {idx} ({domain}):\n{content}...")

            # Only build section if we have actual competitor content
            if competitor_content_summary:
                competitors_text = "\n\n".join(competitor_content_summary)
                competitor_section = f"""

=== COMPETITOR BLOG DATA (USE WITH EXTREME CAUTION) ===

⚠️ CRITICAL WARNINGS - READ CAREFULLY:
1. These are COMPETITOR blogs that are currently ranking on SERP
2. Competitors are promoting THEMSELVES and painting THEMSELVES in positive light
3. DO NOT praise competitors or make them look good
4. DO NOT copy their promotional language about their products/services
5. DO NOT recommend competitor tools or solutions
6. INSTEAD: Analyze their content structure, topics covered, and data points
7. INSTEAD: Use similar strategies to highlight OUR strengths and position US as the best solution
8. INSTEAD: If they mention benefits, show how WE provide similar or better benefits
9. LEARN from their approach but PROMOTE our company, not theirs

Use this data to understand:
- What topics and sections they cover
- What data points and statistics they use
- How they structure their content
- What examples and case studies they include

Then MIRROR this level of detail and comprehensiveness while promoting OUR company's strengths. But do not promote our company aroud something that our company is not capable of right now.

{competitors_text}

⚠️ REMEMBER: Never praise competitors. Use our strengths to position us as the superior choice.
"""

        # Tools research section (Step 10)
        tools_section = ""
        if tools_data and len(tools_data) > 0:
            tools_section = f"""

=== TOOLS RESEARCH (Step 10 Data) ===

The following tools have been researched for this blog:
{json.dumps(tools_data, indent=2)}

IMPORTANT: Incorporate these tools into the blog content naturally. Include tool names, features, and use cases where relevant. Link to tool URLs when mentioning them."""

        # Resource links section (Step 11)
        resources_section = ""
        if resource_links and len(resource_links) > 0:
            resources_section = f"""

=== CURATED RESOURCE LINKS (Step 11 Data) ===

The following external resources have been curated for reference:
{json.dumps(resource_links, indent=2)}

IMPORTANT: Use these resources to support points in the blog. Reference YouTube videos, Reddit discussions, research papers, or articles where appropriate. Link to these resources naturally within the content."""

        # Competitor analysis section (Step 3)
        competitor_analysis_section = ""
        if competitor_analysis and any(competitor_analysis.values()):
            ca_parts = ["", "=== COMPETITOR ANALYSIS INSIGHTS (Step 3 - CRITICAL) ===", ""]

            quintessential = competitor_analysis.get("quintessential_elements", [])
            if quintessential:
                ca_parts.append("MUST-HAVE ELEMENTS (Found in ALL top competitors):")
                for elem in quintessential:
                    ca_parts.append(f"- {elem}")
                ca_parts.append("")
                ca_parts.append("🔴 CRITICAL: These elements appear in ALL successful competitor blogs. The blog MUST cover these topics/sections to be competitive.")
                ca_parts.append("")

            differentiators = competitor_analysis.get("differentiators", [])
            if differentiators:
                ca_parts.append("DIFFERENTIATORS (Unique credibility elements to stand out):")
                for diff in differentiators:
                    ca_parts.append(f"- {diff}")
                ca_parts.append("")
                ca_parts.append("IMPORTANT: Use these elements to differentiate from competitors and add unique value.")
                ca_parts.append("")

            skip_sections = competitor_analysis.get("skip_sections", [])
            if skip_sections:
                ca_parts.append("SECTIONS TO AVOID:")
                for skip in skip_sections:
                    ca_parts.append(f"- {skip}")
                ca_parts.append("")
                ca_parts.append("IMPORTANT: Do NOT include these competitor-specific sections that don't apply to our company.")

            competitor_analysis_section = "\n".join(ca_parts)

        # LLM optimization plan section (Step 8)
        optimization_section = ""
        if optimization_plan and any(optimization_plan.values()):
            optimization_section = f"""

=== LLM OPTIMIZATION PLAN (Step 8 - CRITICAL) ===

{json.dumps(optimization_plan, indent=2)}

🔴 CRITICAL INSTRUCTIONS -
This plan specifies WHERE/WHAT to add glossary sections, "What is X?" headings, and summary openers:

GLOSSARY SECTIONS:
- Add a glossary box/section with term definitions (e.g., "## Glossary", "## Key Terms")
- Include specific terms and their definitions as listed in glossary_sections
- This is a DEDICATED section for terms and definitions, not a generic content section

WHAT IS X SECTIONS:
- Add actual section headings as specified in what_is_sections (e.g., "## What is AI calling")
- The "heading" field contains the EXACT heading text to use
- If "heading" is missing, generate heading from "topic" field as "What is [topic]"
- Place these as H2 or H3 headings in the specified section location
- Write content under these headings explaining the topic

SUMMARY OPENERS:
- For sections with needs_summary_opener: true → Start with a 1-line summary intro (don't explicitly write "summary")

OTHER OPTIMIZATIONS:
- Follow section_optimizations for needs_glossary, needs_what_is_format flags
- Prioritize sections marked priority: "high" first
- Do NOT guess placement - follow this plan exactly"""

        company_context = await self._build_company_context()

        user_prompt = f"""Title: {title}

Outline:
{json.dumps(outline, indent=2)}

Collected Data with sources(CRITICAL - TRY TO USE ALL THESE DATA POINTS ONE BY ONE and ORGANICALLY WHEREVER RELEVANT IN THE BLOG ):
{json.dumps(collected_data, indent=2)}

Credibility Elements:
{json.dumps(credibility_elements, indent=2)}
{competitor_analysis_section}
{optimization_section}
{tools_section}
{resources_section}

Business Context:
{business_context}
{blog_type_section}
{expert_section}
{qa_section}
{competitor_section}
{company_context}

Write the complete blog draft following all guidelines, ensuring it matches the blog type and purpose, incorporates expert guidance and contextual Q&A, and uses competitor insights strategically while positioning our company as the superior choice. Use simple English. Avoid fancy words. Write in short or medium sentences. And write complete sentences where possible.  Do not use informal language - but use simple and easily understandable english."""

        response = await self._call_gpt4(
            system_prompt,
            user_prompt,
            # temperature=0.8,
            # max_tokens=20000
        )
        return response, self._last_full_prompt

    # Step 18: FAQ Accordion
    async def generate_faqs(
        self,
        primary_keyword: str,
        secondary_keywords: List[str],
        blog_content: str,
        user_faq_hints: List[Dict] = None,
        blog_type: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """Generate answers for user FAQ hints + 3 additional AI-generated FAQs."""
        system_prompt = """You are an SEO expert creating FAQ sections with TWO tasks:

TASK 1: Generate complete answers for user-provided FAQ questions
- User will provide questions and brief answer hints
- Expand hints into comprehensive, well-written answers (100-200 words each)
- Maintain the user's intent from hints
- Use blog content and context for accuracy
- Naturally incorporate relevant keywords

TASK 2: Generate 3 ADDITIONAL complementary FAQs
- Create questions that complement the user's FAQs
- Avoid duplicating user's topics
- Cover important gaps in the FAQ coverage
- Questions should follow "People Also Ask" patterns
- Answers must be 100-200 words
- Naturally include secondary keywords

Return EXACTLY this JSON structure:

{
  "user_faqs_with_answers": [
    {
      "question": "User's question",
      "answer": "Your generated answer based on hints",
      "keywords_used": ["keyword1", "keyword2"],
      "schema_type": "FAQPage"
    }
  ],
  "additional_faqs": [
    {
      "question": "What is [topic/concept]?",
      "answer": "Concise answer using information from the blog",
      "keywords_used": ["keyword1", "keyword2"],
      "schema_type": "FAQPage"
    }
  ],
  "total_count": <user_count + 3>,
  "seo_notes": "How these FAQs support SEO and user intent"
}

IMPORTANT:
- user_faqs_with_answers: One entry for EACH user question (with AI-generated answer)
- additional_faqs: EXACTLY 3 FAQs (no more, no less)
- Avoid duplicating topics between user FAQs and additional FAQs
- Use simple English, avoid fancy words
- Return only valid JSON"""

        # Build user FAQ hints section
        user_faqs_section = ""
        if user_faq_hints is None:
            user_faq_hints = []

        if user_faq_hints and len(user_faq_hints) > 0:
            user_hints_list = []
            for i, faq in enumerate(user_faq_hints, 1):
                user_hints_list.append(f"{i}. Q: {faq.get('question', '')}\n   Hints: {faq.get('hints', '')}")
            user_hints_text = "\n".join(user_hints_list)
            user_faqs_section = f"\n\n=== USER FAQ QUESTIONS + HINTS ({len(user_faq_hints)} total) ===\n\n{user_hints_text}\n\nTASK 1: Generate comprehensive answers (100-200 words) for EACH of these FAQs using the hints.\nTASK 2: Generate 3 DIFFERENT FAQs that cover other important aspects not covered by user FAQs."
        else:
            user_faqs_section = "\n\n=== USER FAQ QUESTIONS ===\n\nThe user provided 0 FAQs. Generate 3 FAQs covering the most important topics."

        blog_type_section = f"\n\nBlog Type and Purpose:\n{blog_type}\n\nIMPORTANT: Generate FAQs that align with the blog type and its objectives. Questions should address reader needs specific to this content type." if blog_type else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: Generate FAQs that address questions related to the expert insights. Ensure answers reflect the domain knowledge and fresh perspective provided."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Ensure FAQ answers match the specified writing style and tone."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== CONTEXTUAL Q&A with with a human Expert ===\n{contextual_qa}\n\nIMPORTANT: Feel  free to use the above Use Q&A content to inform answers but do not base on FAQ questions exactly on the contextual QnA above."

        company_context = await self._build_company_context()

        user_prompt = f"""Primary Keyword: {primary_keyword}

Secondary Keywords: {', '.join(secondary_keywords)}

Blog Content Summary:
{blog_content[:3000]}
{user_faqs_section}
{blog_type_section}
{expert_section}
{qa_section}
{company_context}

Generate EXACTLY 3 FAQs that complement the user-provided FAQs and support the blog type, purpose, expert guidance, and contextual Q&A."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # Step 19: Meta Description
    async def generate_meta_description(
        self,
        title: str,
        primary_keyword: str,
        secondary_keywords: List[str],
        blog_summary: str,
        blog_type: str = "",
        expert_opinion: str = "",
        writing_style: str = "",
        contextual_qa: str = ""
    ) -> tuple[str, str]:
        """Generate meta description."""
        system_prompt = """You are an SEO copywriter creating meta descriptions for a blog post. First recall what good meta description should be like.

Now Our Requirements:
- 150-160 characters
- DO not write in informal way and do not write in first person
- Include primary keyword early
- Answer main question/promise
- Include 2-3 secondary keywords naturally
- Mention 3-4 key points/tools
- Compelling and clickable
- Use simple English. Avoid fancy words.

Return just the meta description text (no JSON)."""

        blog_type_section = f"\n\nBlog Type: {blog_type}\n\nEnsure the meta description reflects the blog type and attracts the right audience." if blog_type else ""

        expert_section = ""
        if expert_opinion or writing_style:
            expert_section = "\n\n=== EXPERT GUIDANCE (CRITICAL - HIGHEST PRIORITY) ==="
            if expert_opinion:
                expert_section += f"\n\nExpert Domain Knowledge & Fresh Perspective:\n{expert_opinion}\n\nIMPORTANT: Hint at the unique expert insights in the meta description to attract readers seeking authentic expertise."
            if writing_style:
                expert_section += f"\n\nWriting Style Preferences:\n{writing_style}\n\nIMPORTANT: Ensure meta description tone matches the specified writing style."

        qa_section = ""
        if contextual_qa:
            qa_section = f"\n\n=== Q&A with a human Expert===\n{contextual_qa[:500]}...\n\nIMPORTANT: Hint at unique insights, case studies, or specific data from the Q&A to make the meta description compelling."

        company_context = await self._build_company_context()

        user_prompt = f"""Title: {title}
Primary Keyword: {primary_keyword}
Secondary Keywords: {', '.join(secondary_keywords[:3])}

Blog Outline (what the blog covers):
{blog_summary if blog_summary else 'No outline provided'}
{blog_type_section}
{expert_section}
{qa_section}
{company_context}

Generate the meta description that aligns with the blog type, expert guidance, and Q&A insights."""
        # NOTE (2025-01-02): Label changed from "Blog Summary:" to "Blog Outline (what the blog covers):"
        # This is more accurate for webinar workflow which passes formatted outline instead of blog draft.
        # The 'blog_summary' parameter is backward-compatible - accepts both draft summaries and outlines.

        response = await self._call_gpt4(system_prompt, user_prompt)
        return response.strip(), self._last_full_prompt

    # Step 9: Data Collection - AI Suggestions
    async def generate_data_point_ideas(
        self,
        primary_keyword: str,
        outline: Dict[str, Any],
        customization_context: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """
        Generate 10 broad data point ideas for the creator to research.
        These are NOT actual data points, but guidance on what kinds of data to look for.

        Args:
            primary_keyword: Blog topic keyword
            outline: Generated blog outline structure
            customization_context: User-provided constraints (e.g., "Do not suggest performance benchmarks")

        Returns:
            Tuple of (dict with ideas list, full LLM prompt)
        """
        system_prompt = """You are a data research strategist helping a technical content creator identify valuable data points to strengthen their blog post.

Generate EXACTLY 10 broad, actionable ideas for what kinds of data points the creator should look for. Do NOT give the actual data points themselves, but strategic directions for research.

Return EXACTLY this JSON structure:

{
  "ideas": [
    {
      "idea": "Look for latency and performance benchmarks comparing X vs Y",
      "rationale": "Performance data adds credibility and helps readers make informed technical decisions"
    },
    {
      "idea": "Find market adoption statistics and growth trends for the technology",
      "rationale": "Market data validates the relevance and future-proofing of the approach"
    }
  ]
}

REQUIREMENTS:
- All 10 ideas must be specific to the blog topic and MOST IMPORTANTLY relevant to the outline
- Tailor suggestions to the blog type (e.g., benchmark-data blogs need comparison metrics, problem-solution needs failure rates)
- Each idea should explain WHY that data would strengthen the blog
- Focus on data that's likely findable (not obscure metrics)
- Prioritize quantitative data over qualitative when possible
- Consider: benchmarks, market stats, adoption rates, case studies, technical measurements, user surveys, research findings"""

        # Extract outline structure
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        company_context = await self._build_company_context()

        customization_note = ""
        if customization_context.strip():
            customization_note = f"\n\nUSER CONSTRAINTS:\n{customization_context}\n(Respect these constraints and do NOT suggest ideas that violate them)"

        user_prompt = f"""Primary Keyword: {primary_keyword}

Outline Structure:
{outline_summary}

{customization_note}

Generate 10 strategic data point ideas that would strengthen this blog post."""

        response = await self._call_gpt4(system_prompt, user_prompt)

        # Parse JSON response
        import json
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            logger.error("Failed to parse data point ideas JSON response")
            result = {"ideas": [], "error": "Failed to parse LLM response"}

        return result, self._last_full_prompt

    async def generate_research_prompts(
        self,
        primary_keyword: str,
        outline: Dict[str, Any],
        recommended_direction: str = "",
        customization_context: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """
        Generate 10 copy-paste ready research prompts for an LLM research assistant.
        These prompts will be used by creators to ask an AI to find specific data points.

        Args:
            primary_keyword: Blog topic keyword
            outline: Generated blog outline structure
            recommended_direction: Optional guidance from data point ideas
            customization_context: User-provided constraints

        Returns:
            Tuple of (dict with prompts list, full LLM prompt)
        """
        system_prompt = """You are a prompt engineer creating research prompts for an LLM research assistant.

Generate  10 ready-to-use prompts that are  broad and that could help me create data points (stats, numbers, figures, survey/research results, benchmarks data etc) for a blog. i would be giving this prompt to an LLM assistant that does research on web, research papers etc.
They should be in simple plain english (but technical terms allowed).  Add this line  to the end of each prompt: "Find and provide data/points(stats, survey/research results, benchmarks etc) along with sources, link and publication date (include research papers too)"

Remember that i will be copying-pasting the prompts one by one into an LLM research assistant (like ChatGPT with web search, Perplexity, or Claude).

Each prompt should:
- Should be short and a maximum of 30 words
- Be self-contained and immediately usable (no placeholders)
- Request verifiable data points
- Ask for sources and citations
- Target data that strengthens the blog's credibility
- Be broad enough to yield results, specific enough to be actionable
- in simple english and when using acronyms, give expanded full forms in bracket

Return EXACTLY this JSON structure:

{
  "prompts": [
    {
      "prompt": "Find the latest performance benchmarks comparing FastAPI vs Flask for API response times under 10,000 concurrent requests. Find and provide data points along with sources, link and publication date (include research papers too)",
      "data_type": "Performance benchmarks",
      "expected_output": "Numerical metrics with source citations"
    },
    {
      "prompt": "What is the current market share and adoption rate of Kubernetes in production environments? Focus on 2024-2025 data with sources from reputable surveys (CNCF, Stack Overflow, etc.). Find and provide data points along with sources, link and publication date (include research papers too)",
      "data_type": "Market statistics",
      "expected_output": "Percentage data with survey sources"
    }
  ]
}

QUALITY CRITERIA:
- Prompts must be specific to the blog topic and outline
- Prompts should not be more than 30 words and in simple English
- Each prompt should target different data pointers
- Prompts should explicitly request sources and dates
- Avoid generic prompts - make them actionable for this specific blog
"""

        # Extract outline structure
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        company_context = await self._build_company_context()

        customization_note = ""
        if customization_context.strip():
            customization_note = f"\n\nUSER CONSTRAINTS:\n{customization_context}\n(Do NOT create prompts that violate these constraints)"

        direction_note = ""
        if recommended_direction.strip():
            direction_note = f"\n\nRECOMMENDED FOCUS:\n{recommended_direction}"

        user_prompt = f"""Primary Keyword: {primary_keyword}

Outline Structure (CRITICAL and MOST IMPORTANT):
{outline_summary}
{customization_note}

Generate 10 copy-paste ready research prompts for an LLM research assistant. """

        response = await self._call_gpt4(system_prompt, user_prompt)

        # Parse JSON response
        import json
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            logger.error("Failed to parse research prompts JSON response")
            result = {"prompts": [], "error": "Failed to parse LLM response"}

        return result, self._last_full_prompt

    # Step 10: Tools Research - AI Suggestions
    async def generate_tool_suggestions(
        self,
        primary_keyword: str,
        outline: Dict[str, Any],
        customization_context: str = ""
    ) -> tuple[Dict[str, Any], str]:
        """
        Generate 4-5 tool suggestions for building voice agents.
        Each tool includes 3-4 brief points about what to look for when researching.

        Args:
            primary_keyword: Blog topic keyword (used as title context)
            outline: Generated blog outline structure
            customization_context: User-provided constraints (optional)

        Returns:
            Tuple of (dict with tool_suggestions list, full LLM prompt)
        """
        system_prompt = """You are a domain expert helping identify relevant tools (for reviewing and researching) for writing a blog.

Generate EXACTLY 4-5 tool suggestions that are relevant for someone writing a blog on given topic by the user.

For each tool, provide 3-4 BRIEF points (max 10 words each) about what to look for when researching.

Return EXACTLY this JSON structure:

{
  "tool_suggestions": [
    {
      "tool_name": "Twilio Voice API",
      "what_to_look_for": [
        "Pricing per minute for voice calls",
        "Features and termonoloogies within the platform",
        "Supported languages and regions"
      ]
    }
  ]
}

REQUIREMENTS:
- Tools must be relevant to the blog topic
- Each point should be brief (5-6 words)
- Focus on practical aspects
- Tailor to the blog's specific topic and outline"""

        # Extract outline structure
        outline_summary = ""
        if isinstance(outline, dict):
            sections = outline.get("sections", [])
            outline_summary = "\n".join([f"- {s.get('h2', '')}" for s in sections])

        # customization_note = ""
        # if customization_context.strip():
        #     customization_note = f"\n\nUSER CONSTRAINTS:\n{customization_context}\n(Do NOT suggest tools that violate these constraints)"

        user_prompt = f"""Blog Topic: {primary_keyword}

Outline Structure:
{outline_summary}


Generate 4-5 tool suggestions relevant in the context of this blog."""

        response = await self._call_gpt4(system_prompt, user_prompt)

        # Parse JSON response
        import json
        try:
            result = json.loads(response)
        except json.JSONDecodeError:
            logger.error("Failed to parse tool suggestions JSON response")
            result = {"tool_suggestions": [], "error": "Failed to parse LLM response"}

        return result, self._last_full_prompt

    # Step 20: AI Signal Removal
    async def remove_ai_signals(self, blog_content: str) -> tuple[Dict[str, Any], str]:
        """Analyze and fix AI-written signals."""
        system_prompt = """You are an editor removing AI-written signals from content.

Analyze and fix the content, then return EXACTLY this JSON structure:

{
  "cleaned_content": "The full blog content with all AI signals removed and fixes applied",
  "changes_made": [
    "Replaced 3 instances of curly quotes with straight quotes",
    "Removed phrase 'delve into' in paragraph 2",
    "Replaced 'It is important to note' with direct statement"
  ],
  "warnings": [
    "Section 3 still feels slightly repetitive",
    "Could use more opinionated stance in conclusion"
  ],
  "ai_signals_found": 7,
  "signal_details": {
    "quotes": 3,
    "ai_phrases": 2,
    "cliches": 1,
    "repetitions": 1
  },
  "recommendation": "Overall assessment of content quality and human-like tone"
}

AI SIGNALS TO FIX:
1. Replace curly quotes ("") with straight quotes ("")
2. Replace em-dash (—) and en-dash (–) with hyphens (-)
3. Remove AI phrases: "It's not just X, it's also Y", "delve", "glimpse", "stark", "landscape"
4. Remove clichés: "In today's world", "Needless to say", "It is important to note"
5. Fix idea repetition (same point made multiple times)
6. Ensure opinion/bias exists (avoid overly neutral tone)
7. Check for keyword stuffing (unnatural keyword density)

IMPORTANT: Use these exact field names. Include the FULL cleaned content. Use simple English but not informal.  Return only valid JSON."""

        user_prompt = f"""Content to clean:
{blog_content}

# TASK : Fix all AI signals and return cleaned version."""

        response = await self._call_gpt4(
            system_prompt,
            user_prompt,
            json_mode=True,
            # max_tokens=20000
        )
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            logger.debug(f"Raw response: {response[:500]}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    # ========================================
    # WEBINAR WORKFLOW METHODS
    # ========================================

    async def analyze_webinar_competitors(
        self,
        webinar_topic: str,
        competitor_summaries: List[Dict[str, Any]]  # FIX (2025-01-02): Changed from List[Dict[str, str]] to allow int word_count
    ) -> tuple[Dict[str, Any], str]:
        """
        Analyze competitor content for webinar topic.
        Identifies common topics, structural patterns, and writing style.

        FIXED (2025-01-02): Now receives and analyzes FULL blog content instead of 300-char snippets.

        Args:
            webinar_topic: Topic of the webinar
            competitor_summaries: List of competitor content with fields:
                - title (str): Blog title
                - content (str): FULL blog text (5000+ chars)
                - url (str): Blog URL
                - word_count (int): Number of words in content

        Returns:
            Tuple of (analysis_dict, full_prompt_with_variables)
        """
        logger.info(f"Analyzing {len(competitor_summaries)} competitor blogs for webinar topic: '{webinar_topic}'")

        # Build competitor content string with FULL content for deep analysis
        # CRITICAL: Use comp.get('content') which contains full blog text from Tavily extract
        # Previously used 'snippet' field which was only 300 chars - insufficient for analysis
        # FIX (2025-01-02): Removed 5000-char truncation to match standard blog workflow
        # Use full competitor content for comprehensive analysis (GPT-5.2 has 128k token context)
        # Typical usage: 10 competitors × ~3,500 tokens = ~35k tokens (27% of context window)
        # Full content needed to analyze conclusions, case studies, CTAs, and complete article structure
        competitor_text = "\n\n".join([
            f"COMPETITOR {idx + 1}:\n"
            f"Title: {comp.get('title', 'N/A')}\n"
            f"URL: {comp.get('url', 'N/A')}\n"
            f"Word Count: {comp.get('word_count', 0)}\n"  # word_count is int, not string
            f"FULL CONTENT:\n{comp.get('content', 'N/A')}"  # Complete blog content for comprehensive analysis
            for idx, comp in enumerate(competitor_summaries)
        ])

        system_prompt = """You are an expert content analyst specializing in blog structure and writing style analysis.
Analyze competitor blogs to identify patterns that will help create a better blog post."""

        user_prompt = f"""Analyze the FULL CONTENT of these competitor blogs about "{webinar_topic}":

{competitor_text}

Based on the COMPLETE blog content above (not just snippets), identify:

1. Common topics all competitors cover - Extract the main themes and subjects discussed across all blogs
2. Structural patterns - How they organize content (e.g., problem-solution, step-by-step tutorial, listicle, story-driven introduction, technical deep-dive with examples, comparison framework)
3. Writing style - Analyze tone, voice, perspective (e.g., formal vs casual, first-person vs third-person, conversational vs academic, use of examples/anecdotes, technical depth)
4. Key insights - What makes their content effective or ineffective (provide 3-5 specific, actionable insights about structure, formatting, content depth, or reader engagement)

Return JSON with:
{{
  "common_topics": ["topic1", "topic2", "topic3"],
  "structural_patterns": "Most blogs use X structure... They typically start with Y... Main sections follow Z pattern...",
  "writing_style": "Blogs tend to be Y in tone... They use X perspective... Common patterns include...",
  "key_insights": ["Insight 1 about what works", "Insight 2 about patterns", "Insight 3 about effectiveness"]
}}"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    async def generate_webinar_outline(
        self,
        webinar_topic: str,
        transcript: str,
        competitor_insights: Dict[str, Any],
        guidelines: Dict[str, Any],
        content_format: str,
        guest_name: Optional[str] = None
    ) -> tuple[Dict[str, Any], str]:
        """
        Generate blog outline from webinar transcript.

        Args:
            webinar_topic: Webinar topic
            transcript: Full webinar transcript
            competitor_insights: Insights from competitor analysis
            guidelines: Content guidelines (emphasize, avoid, tone)
            content_format: 'ghostwritten' or 'conversational'
            guest_name: Guest name if applicable

        Returns:
            Tuple of (outline_dict, full_prompt_with_variables)
        """
        logger.info(f"Generating outline for webinar: '{webinar_topic}' | Format: {content_format}")

        # Truncate transcript if too long (keep first 8000 words)
        transcript_words = transcript.split()
        if len(transcript_words) > 8000:
            transcript = " ".join(transcript_words[:8000]) + "\n\n[TRANSCRIPT TRUNCATED FOR PROCESSING]"
            logger.info(f"Transcript truncated from {len(transcript_words)} to 8000 words")

        system_prompt = """You are a content strategist creating blog outlines from webinar content.

Generate a comprehensive outline and return EXACTLY this JSON structure:

{
  "h1_placeholder": "[Main Title Placeholder - will be finalized later]",
  "sections": [
    {
      "h2": "Main Section Heading",
      "subsections": [
        {
          "h3": "Subsection Heading",
          "content_type": "list|narrative|data-driven|comparison|tutorial",
          "description": "What this subsection should cover"
        }
      ]
    }
  ],
  "special_sections": {
    "glossary": {
      "position": "after_section_2",
      "terms_count": 5,
      "description": "Key terms to define"
    },
    "conclusion": {
      "key_takeaways": "Main points to emphasize"
    }
  }
}

IMPORTANT: Use these exact field names. Include at least 5-7 main sections with 2-4 subsections each. Use simple English. Avoid fancy words. Return only valid JSON."""

        emphasize_str = "\n- ".join(guidelines.get("emphasize", [])) if guidelines.get("emphasize") else "None specified"
        avoid_str = "\n- ".join(guidelines.get("avoid", [])) if guidelines.get("avoid") else "None specified"

        # Content format guidance
        content_format_guidance = ""
        if content_format == "ghostwritten":
            content_format_guidance = "\n\nCONTENT FORMAT: Ghostwritten\nDO NOT write in first person like 'I'. Use professional tone and 'we' when needed. The blog should be written professionally as expert content, not as personal narrative."
        elif content_format == "conversational":
            content_format_guidance = "\n\nCONTENT FORMAT: Conversational\nWrite in a conversational, approachable tone. Use 'we' when discussing concepts. Avoid overly formal or academic language."

        user_prompt = f"""Create a blog outline from this webinar transcript.

WEBINAR TRANSCRIPT:
{{{{TRANSCRIPT:{transcript}}}}}

COMPETITOR INSIGHTS (Focus on what competitors are doing and covering):
Common Topics (across the competitors): {', '.join(competitor_insights.get('common_topics', []))}
Structural Patterns: {competitor_insights.get('structural_patterns', 'None')}

CONTENT GUIDELINES:
Emphasize:
- {emphasize_str}

Avoid:
- {avoid_str}

Tone: {guidelines.get('tone', 'conversational')}
{content_format_guidance}

Create a comprehensive, structured outline with:
1. h1_placeholder for the main title (not full text - just a placeholder)
2. 5-7 main sections (h2 headings) covering key topics from the webinar
3. For each section: 2-4 subsections with h3 headings, content_type, and description
4. Special sections (glossary, conclusion, etc.)

DO NOT write full introduction or conclusion text - only structural placeholders and descriptions."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    async def plan_webinar_llm_optimization(
        self,
        outline_sections: List[Dict[str, Any]]
    ) -> tuple[Dict[str, Any], str]:
        """
        Plan LLM optimization markers (glossary + "What is X" sections) from outline.

        Args:
            outline_sections: Outline sections from Step 6

        Returns:
            Tuple of (optimization_dict, full_prompt_with_variables)
        """
        logger.info(f"Planning LLM optimization from outline sections")

        # Build section headings with subsections
        # FIX (2025-01-02): Format subsections as indented list so LLM sees complete outline hierarchy
        # Example output: "1. Main Heading\n   - Subsection 1\n   - Subsection 2"
        # Previously only showed h2 headings without subsection details
        section_headings = []
        for s in outline_sections:
            section_headings.append(f"{s.get('section_number')}. {s.get('heading')}")
            for sub in s.get('subsections', []):
                section_headings.append(f"   - {sub.get('h3', '')}")  # Indent subsections for clarity
        sections_str = "\n".join(section_headings)

        system_prompt = """You are an SEO and content optimization expert.
Identify technical terms and concepts from the blog outline that need explanation."""

        user_prompt = f"""Analyze this blog outline to identify:
1. 3-4 glossary terms (technical jargon that needs definition)
2. 2-3 "What is X?" sections (foundational concepts that warrant full explanation)

IMPORTANT: For "What is X?" sections, X should be a SPECIFIC CONCEPT from the outline.
Examples of correct format:
- "What is Voice AI?"
- "What is Natural Language Processing?"
- "What is Conversational AI?"
- "What is API latency?"

DO NOT use generic "What is" - always include the specific concept.

OUTLINE SECTIONS (with subsections):
{sections_str}

For each glossary term, suggest placement in outline.
For each "What is X" section, suggest placement and provide rationale.

Constraints:
- Maximum 4 glossary items
- Maximum 3 "What is X" sections
- Focus on terms inferred from the outline headings

Return JSON with:
{{
  "glossary_items": [
    {{
      "term": "AI Calling Agent",
      "suggested_position": "After Section 2"
    }}
  ],
  "what_is_sections": [
    {{
      "topic": "What is Voice AI?",
      "suggested_position": "Before Section 1",
      "rationale": "Foundational concept that readers need to understand before diving into the main content"
    }},
    {{
      "topic": "What is Natural Language Processing?",
      "suggested_position": "After Section 3",
      "rationale": "Technical concept mentioned in the webinar that needs detailed explanation"
    }}
  ]
}}"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    async def evaluate_webinar_landing_page(
        self,
        transcript: str,
        webinar_topic: str
    ) -> tuple[Dict[str, Any], str]:
        """
        Evaluate landing page opportunities from webinar discussion.

        Args:
            transcript: Full webinar transcript
            webinar_topic: Topic of webinar

        Returns:
            Tuple of (evaluation_dict, full_prompt_with_variables)
        """
        logger.info(f"Evaluating landing page potential from webinar: '{webinar_topic}'")

        # Truncate transcript
        transcript_words = transcript.split()
        if len(transcript_words) > 6000:
            transcript = " ".join(transcript_words[:6000])

        system_prompt = """You are a conversion strategist evaluating landing page opportunities.
First understand what landing pages are from a product manager perspective.
Analyze the webinar content and return EXACTLY this JSON structure:

{
  "landing_page_options": [
    {
      "title": "Compelling, conversion-focused landing page title",
      "description": "Why this would work as a landing page and how it complements the blog",
      "target_audience": "Specific audience segment this targets",
      "conversion_points": [
        "Point 1 to include on the landing page",
        "Point 2 to include on the landing page",
        "Point 3 to include on the landing page"
      ],
      "cta_suggestions": [
        "Call-to-action option 1",
        "Call-to-action option 2"
      ]
    }
  ],
  "recommendation": "Which option is recommended and why"
}

IMPORTANT: Use these exact field names. Provide exactly 2 landing page options. Use simple English. Avoid fancy words. Return only valid JSON."""

        user_prompt = f"""Analyze this webinar transcript for landing page opportunities.

WEBINAR TOPIC: {{{{WEBINAR_TOPIC:{webinar_topic}}}}}

TRANSCRIPT:
{{{{TRANSCRIPT:{transcript}}}}}

Evaluate:
1. Are there specific products/features discussed that warrant a landing page?
2. What compelling page title would drive conversions?
3. Why would this work as a landing page?
4. What specific audience segment does it target?
5. What conversion points should be on the landing page?
6. What CTAs make sense?

DO NOT suggest a webinar landing page. Focus on products/topics/features discussed in the webinar.
Suggest exactly 2 landing page ideas with complete details for each field.

Based on the webinar content above, identify landing page opportunities."""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")

    async def generate_webinar_blog_draft(
        self,
        transcript: str,
        outline: Dict[str, Any],
        guidelines: Dict[str, Any],
        llm_optimization: Dict[str, Any],
        title: str,
        content_format: str,
        guest_name: Optional[str] = None
    ) -> tuple[Dict[str, Any], str]:
        """
        Generate complete blog draft from webinar transcript.

        Args:
            transcript: Full webinar transcript
            outline: Outline from Step 6
            guidelines: Content guidelines
            llm_optimization: LLM markers from Step 7
            title: Blog title
            content_format: 'ghostwritten' or 'conversational'
            guest_name: Guest name if applicable

        Returns:
            Tuple of (draft_dict, full_prompt_with_variables)
        """
        logger.info(f"Generating blog draft | Format: {content_format} | Target: 2000 words")

        # Truncate transcript to stay within token limits (keep first 10k words)
        transcript_words = transcript.split()
        if len(transcript_words) > 10000:
            transcript = " ".join(transcript_words[:10000])

        # Format outline sections for LLM prompt with correct field names
        # CRITICAL FIX (2025-01-02): Use correct field names from Step 6 output
        # Step 6 outputs: {"sections": [{"h2": "...", "subsections": [{"h3": "...", "content_type": "...", "description": "..."}]}]}
        # Previously tried to access "section_number" and "heading" which don't exist → caused "None. None" in prompts
        sections_str = ""
        for idx, section in enumerate(outline.get("sections", []), 1):
            # Extract h2 (main section heading) - NOT "heading" field
            h2_heading = section.get('h2', f'Section {idx}')
            sections_str += f"\n{idx}. {h2_heading}\n"

            # Extract subsections with h3, content_type, and description
            # Previously just printed raw dict objects - now properly formatted
            for subsection in section.get("subsections", []):
                h3 = subsection.get('h3', '')  # Subsection heading
                content_type = subsection.get('content_type', '')  # e.g., "explanation", "example", "list"
                description = subsection.get('description', '')  # What to cover
                sections_str += f"   - {h3} ({content_type}): {description}\n"

        # Build optimization markers
        glossary_str = "\n- ".join([item.get("term", "") for item in llm_optimization.get("glossary_items", [])])
        what_is_str = "\n- ".join([item.get("topic", "") for item in llm_optimization.get("what_is_sections", [])])

        emphasize_str = "\n- ".join(guidelines.get("emphasize", [])) if guidelines.get("emphasize") else "None"
        avoid_str = "\n- ".join(guidelines.get("avoid", [])) if guidelines.get("avoid") else "None"

        voice_instruction = ""
        if content_format == "ghostwritten":
            voice_instruction = f"Write in FIRST PERSON as if {guest_name or 'the guest'} is the author. Use 'I', 'we', 'my experience'. The guest is sharing their insights directly."
        else:
            voice_instruction = "Write as a CONVERSATIONAL discussion between host and guest. Include dialogue with speaker labels. Add contextual notes where helpful."

        system_prompt = f"""You are an expert blog writer and ghostwriter.
Write a complete, engaging blog post based on this webinar transcript.

{voice_instruction}

IMPORTANT: Quote the guest directly when impactful. Maintain conversational tone. Apply SEO best practices."""

        user_prompt = f"""Write a complete blog post based on this webinar transcript.

TITLE: {title}

WEBINAR TRANSCRIPT:
{transcript}

OUTLINE TO FOLLOW:
Introduction: {outline.get('introduction', '')}

Sections:
{sections_str}

Conclusion: {outline.get('conclusion', '')}

CONTENT GUIDELINES:
Emphasize:
- {emphasize_str}

Avoid:
- {avoid_str}

Tone: {guidelines.get('tone', 'conversational')}

LLM OPTIMIZATIONS TO INSERT:
Glossary Terms:
- {glossary_str}

"What is X" Sections:
- {what_is_str}

REQUIREMENTS:
1. Follow outline structure exactly
2. Speak in first person if ghostwritten - And since its ghostwritten , do NOT mention stuff like - "As I said on the webinar" as we are assuming that the author/guest is writing this blog  and there was no webinar etc
3. Maintain {content_format} format. 
4. Apply SEO best practices
5. Insert glossary/what-is sections in the right places in the blog
6. Target word count: 2000+ words
7. Use markdown formatting (headers, bold, lists, etc.)

Return JSON with:
{{
  "content": "# {title}\\n\\nFull blog content in markdown...",
  "word_count": 2047,
  "sections_completed": 7,
  "llm_markers_inserted": 5
}}"""

        response = await self._call_gpt4(system_prompt, user_prompt, json_mode=True)
        try:
            return json.loads(response), self._last_full_prompt
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI JSON parse error: {e}")
            raise ValueError(f"Invalid JSON from OpenAI: {str(e)}")


# Singleton instance
openai_service = OpenAIService()
