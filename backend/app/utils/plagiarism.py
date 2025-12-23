"""
N-gram based plagiarism detection utility.
Uses word n-grams (5-gram or 7-gram) to detect similarity between texts.
No ML or LLM required - simple overlap calculation.
"""

from typing import List, Set, Dict, Any, Optional
from pathlib import Path
import json
import re


def tokenize(text: str) -> List[str]:
    """
    Tokenize text into words.

    Args:
        text: Input text string

    Returns:
        List of lowercase words
    """
    if not text or not isinstance(text, str):
        return []

    # Convert to lowercase and extract words (alphanumeric + hyphens)
    words = re.findall(r'\b[a-z0-9\-]+\b', text.lower())
    return words


def generate_ngrams(words: List[str], n: int = 5) -> Set[str]:
    """
    Generate n-grams from list of words.

    Args:
        words: List of words
        n: N-gram size (default: 5)

    Returns:
        Set of n-grams (each n-gram is a space-joined string)
    """
    if len(words) < n:
        # If text is shorter than n-gram size, return the entire text as one n-gram
        return {' '.join(words)} if words else set()

    ngrams = set()
    for i in range(len(words) - n + 1):
        ngram = ' '.join(words[i:i + n])
        ngrams.add(ngram)

    return ngrams


def calculate_ngram_similarity(text1: str, text2: str, n: int = 5) -> float:
    """
    Calculate n-gram overlap similarity between two texts.

    Args:
        text1: First text
        text2: Second text
        n: N-gram size (5 or 7 recommended)

    Returns:
        Similarity score between 0.0 and 1.0
        Formula: common_ngrams / total_ngrams
    """
    if not text1 or not text2:
        return 0.0

    # Tokenize
    words1 = tokenize(text1)
    words2 = tokenize(text2)

    if not words1 or not words2:
        return 0.0

    # Generate n-grams
    ngrams1 = generate_ngrams(words1, n)
    ngrams2 = generate_ngrams(words2, n)

    if not ngrams1 or not ngrams2:
        return 0.0

    # Calculate overlap
    common_ngrams = ngrams1 & ngrams2  # Set intersection
    total_ngrams = ngrams1 | ngrams2   # Set union

    if not total_ngrams:
        return 0.0

    similarity = len(common_ngrams) / len(total_ngrams)
    return similarity


def check_url_similarity(url1: str, url2: str) -> float:
    """
    Check if two URLs are similar (exact match or same domain).

    Args:
        url1: First URL
        url2: Second URL

    Returns:
        1.0 if exact match, 0.5 if same domain, 0.0 otherwise
    """
    if not url1 or not url2:
        return 0.0

    # Normalize URLs (lowercase, strip whitespace)
    url1 = url1.lower().strip()
    url2 = url2.lower().strip()

    # Exact match
    if url1 == url2:
        return 1.0

    # Extract domain (simple approach)
    def extract_domain(url: str) -> str:
        # Remove protocol
        url = re.sub(r'^https?://(www\.)?', '', url)
        # Extract domain (everything before first /)
        domain = url.split('/')[0]
        return domain

    domain1 = extract_domain(url1)
    domain2 = extract_domain(url2)

    if domain1 == domain2:
        return 0.5  # Same domain

    return 0.0


def check_keyword_similarity(keywords1: List[str], keywords2: List[str]) -> float:
    """
    Check similarity between two keyword lists.

    Args:
        keywords1: First keyword list
        keywords2: Second keyword list

    Returns:
        Jaccard similarity (intersection / union)
    """
    if not keywords1 or not keywords2:
        return 0.0

    # Normalize keywords (lowercase, strip)
    kw1 = set(k.lower().strip() for k in keywords1)
    kw2 = set(k.lower().strip() for k in keywords2)

    if not kw1 or not kw2:
        return 0.0

    intersection = kw1 & kw2
    union = kw1 | kw2

    if not union:
        return 0.0

    return len(intersection) / len(union)


def check_step_plagiarism(
    current_step_data: Dict[str, Any],
    past_step_data: Dict[str, Any],
    step_number: int,
    n: int = 5
) -> Dict[str, Any]:
    """
    Check plagiarism for a specific step by comparing user inputs.

    Args:
        current_step_data: Current blog's step data
        past_step_data: Past blog's step data
        step_number: Step number (1-22)
        n: N-gram size (default: 5)

    Returns:
        Dictionary with plagiarism details:
        {
            "overall_score": 0.0-1.0,
            "matches": [
                {
                    "field": "field_name",
                    "score": 0.0-1.0,
                    "current": "...",
                    "past": "..."
                }
            ]
        }
    """
    matches = []
    field_scores = []

    # Step 4: Expert Opinion & Content Guidance
    if step_number == 4:
        # Check expert_opinion
        if current_step_data.get("expert_opinion") and past_step_data.get("expert_opinion"):
            score = calculate_ngram_similarity(
                current_step_data["expert_opinion"],
                past_step_data["expert_opinion"],
                n
            )
            if score > 0.2:  # Only record if > 20% similarity
                matches.append({
                    "field": "expert_opinion",
                    "score": score,
                    "current": current_step_data["expert_opinion"][:200] + "...",
                    "past": past_step_data["expert_opinion"][:200] + "..."
                })
            field_scores.append(score)

        # Check writing_style
        if current_step_data.get("writing_style") and past_step_data.get("writing_style"):
            score = calculate_ngram_similarity(
                current_step_data["writing_style"],
                past_step_data["writing_style"],
                n
            )
            if score > 0.2:
                matches.append({
                    "field": "writing_style",
                    "score": score,
                    "current": current_step_data["writing_style"][:200] + "...",
                    "past": past_step_data["writing_style"][:200] + "..."
                })
            field_scores.append(score)

        # Check Q&A answers
        curr_qa = current_step_data.get("question_answers", [])
        past_qa = past_step_data.get("question_answers", [])

        for i, (curr_answer, past_answer) in enumerate(zip(curr_qa, past_qa)):
            if curr_answer.get("answer") and past_answer.get("answer"):
                score = calculate_ngram_similarity(
                    curr_answer["answer"],
                    past_answer["answer"],
                    n
                )
                if score > 0.2:
                    matches.append({
                        "field": f"question_answer_{i+1}",
                        "score": score,
                        "current": curr_answer["answer"][:200] + "...",
                        "past": past_answer["answer"][:200] + "..."
                    })
                field_scores.append(score)

    # Step 5: Secondary Keywords
    elif step_number == 5:
        curr_keywords = current_step_data.get("keywords", [])
        past_keywords = past_step_data.get("keywords", [])

        if curr_keywords and past_keywords:
            score = check_keyword_similarity(curr_keywords, past_keywords)
            if score > 0.2:
                matches.append({
                    "field": "keywords",
                    "score": score,
                    "current": ", ".join(curr_keywords),
                    "past": ", ".join(past_keywords)
                })
            field_scores.append(score)

    # Step 9: Data Collection
    elif step_number == 9:
        curr_data_points = current_step_data.get("data_points", [])
        past_data_points = past_step_data.get("data_points", [])

        for i, curr_dp in enumerate(curr_data_points):
            for j, past_dp in enumerate(past_data_points):
                # Check statistic similarity
                curr_stat = curr_dp.get("statistic") or curr_dp.get("content", "")
                past_stat = past_dp.get("statistic") or past_dp.get("content", "")

                if curr_stat and past_stat:
                    score = calculate_ngram_similarity(curr_stat, past_stat, n)
                    if score > 0.3:  # Higher threshold for data points
                        matches.append({
                            "field": f"data_point_{i+1}_statistic",
                            "score": score,
                            "current": curr_stat,
                            "past": past_stat
                        })
                        field_scores.append(score)

                # Check source URL
                curr_source = curr_dp.get("source", "")
                past_source = past_dp.get("source", "")

                if curr_source and past_source:
                    url_score = check_url_similarity(curr_source, past_source)
                    if url_score > 0.5:  # Same domain or exact match
                        matches.append({
                            "field": f"data_point_{i+1}_source",
                            "score": url_score,
                            "current": curr_source,
                            "past": past_source
                        })
                        field_scores.append(url_score)

    # Step 10: Tools Research
    elif step_number == 10:
        curr_tools = current_step_data.get("tools", [])
        past_tools = past_step_data.get("tools", [])

        for i, curr_tool in enumerate(curr_tools):
            for j, past_tool in enumerate(past_tools):
                curr_url = curr_tool.get("url", "")
                past_url = past_tool.get("url", "")

                if curr_url and past_url:
                    url_score = check_url_similarity(curr_url, past_url)
                    if url_score >= 1.0:  # Exact match only
                        matches.append({
                            "field": f"tool_{i+1}_url",
                            "score": url_score,
                            "current": f"{curr_tool.get('name', '')} - {curr_url}",
                            "past": f"{past_tool.get('name', '')} - {past_url}"
                        })
                        field_scores.append(url_score)

    # Step 11: Resource Links
    elif step_number == 11:
        curr_links = current_step_data.get("links", [])
        past_links = past_step_data.get("links", [])

        for i, curr_link in enumerate(curr_links):
            for j, past_link in enumerate(past_links):
                curr_url = curr_link.get("url", "")
                past_url = past_link.get("url", "")

                if curr_url and past_url:
                    url_score = check_url_similarity(curr_url, past_url)
                    if url_score >= 1.0:  # Exact match only
                        matches.append({
                            "field": f"link_{i+1}_url",
                            "score": url_score,
                            "current": f"{curr_link.get('title', '')} - {curr_url}",
                            "past": f"{past_link.get('title', '')} - {past_url}"
                        })
                        field_scores.append(url_score)

    # Step 12: Credibility Elements
    elif step_number == 12:
        # Check facts
        curr_facts = current_step_data.get("facts", [])
        past_facts = past_step_data.get("facts", [])

        for i, curr_fact in enumerate(curr_facts):
            for j, past_fact in enumerate(past_facts):
                curr_text = curr_fact.get("fact", "") if isinstance(curr_fact, dict) else str(curr_fact)
                past_text = past_fact.get("fact", "") if isinstance(past_fact, dict) else str(past_fact)

                if curr_text and past_text:
                    score = calculate_ngram_similarity(curr_text, past_text, n)
                    if score > 0.3:
                        matches.append({
                            "field": f"fact_{i+1}",
                            "score": score,
                            "current": curr_text[:200] + "...",
                            "past": past_text[:200] + "..."
                        })
                        field_scores.append(score)

        # Check experiences
        curr_exp = current_step_data.get("experiences", [])
        past_exp = past_step_data.get("experiences", [])

        for i, curr_text in enumerate(curr_exp):
            for j, past_text in enumerate(past_exp):
                if curr_text and past_text:
                    score = calculate_ngram_similarity(curr_text, past_text, n)
                    if score > 0.3:
                        matches.append({
                            "field": f"experience_{i+1}",
                            "score": score,
                            "current": curr_text[:200] + "...",
                            "past": past_text[:200] + "..."
                        })
                        field_scores.append(score)

        # Check quotes
        curr_quotes = current_step_data.get("quotes", [])
        past_quotes = past_step_data.get("quotes", [])

        for i, curr_text in enumerate(curr_quotes):
            for j, past_text in enumerate(past_quotes):
                if curr_text and past_text:
                    score = calculate_ngram_similarity(curr_text, past_text, n)
                    if score > 0.3:
                        matches.append({
                            "field": f"quote_{i+1}",
                            "score": score,
                            "current": curr_text[:200] + "...",
                            "past": past_text[:200] + "..."
                        })
                        field_scores.append(score)

    # Step 21: Final Review Checklist
    elif step_number == 21:
        curr_notes = current_step_data.get("notes", "")
        past_notes = past_step_data.get("notes", "")

        if curr_notes and past_notes:
            score = calculate_ngram_similarity(curr_notes, past_notes, n)
            if score > 0.2:
                matches.append({
                    "field": "notes",
                    "score": score,
                    "current": curr_notes[:200] + "...",
                    "past": past_notes[:200] + "..."
                })
            field_scores.append(score)

    # Calculate overall score (average of all field scores)
    overall_score = sum(field_scores) / len(field_scores) if field_scores else 0.0

    return {
        "overall_score": overall_score,
        "matches": matches
    }


def get_plagiarism_level(score: float) -> str:
    """
    Get plagiarism level based on score.

    Args:
        score: Similarity score (0.0-1.0)

    Returns:
        Level string: "unique", "acceptable", "high", "duplicate"
    """
    if score < 0.2:
        return "unique"
    elif score < 0.5:
        return "acceptable"
    elif score < 0.8:
        return "high"
    else:
        return "duplicate"


def get_plagiarism_color(score: float) -> str:
    """
    Get color indicator for plagiarism score.

    Args:
        score: Similarity score (0.0-1.0)

    Returns:
        Color string: "green", "yellow", "orange", "red"
    """
    if score < 0.2:
        return "green"
    elif score < 0.5:
        return "yellow"
    elif score < 0.8:
        return "orange"
    else:
        return "red"
