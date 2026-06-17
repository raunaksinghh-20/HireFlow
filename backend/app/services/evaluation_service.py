"""Evaluation Service — Generates structured AI evaluation of completed interviews."""
import json
import re

from google import genai

from app.config.settings import settings
from app.models.db_models import Interview, Transcript, Resume, Job
from app.core.prompt_templates import EVALUATION_PROMPT
from app.core.rag_builder import build_evaluation_context


def _parse_json_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code fences."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return {}


async def generate_evaluation(
    interview: Interview,
    transcript: Transcript,
    resume: Resume,
    job: Job,
) -> dict:
    """
    Single-shot Gemini API call using vectorless RAG.
    Builds context, calls API, parses structured JSON response.
    Returns the parsed evaluation dict with calculated overall_score.
    """
    # Build RAG context
    context = build_evaluation_context(
        resume_text=resume.extracted_text or "",
        jd_text=job.description or "",
        required_skills=job.required_skills or [],
        experience_years=job.experience_years or 0,
        ats_score=resume.ats_score or 0,
        skill_gaps=resume.skill_gaps or [],
        transcript_turns=transcript.turns or [],
    )

    # Build the prompt
    prompt = EVALUATION_PROMPT.format(**context)

    # Call Gemini
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    # Parse response
    result = _parse_json_response(response.text)

    # Ensure all scores are clamped 0-100
    for key in ["technical_score", "communication_score", "consistency_score", "depth_score", "confidence_score"]:
        result[key] = min(100, max(0, int(result.get(key, 50))))

    # Calculate weighted overall score
    overall = (
        result["technical_score"] * 0.35
        + result["communication_score"] * 0.20
        + result["consistency_score"] * 0.20
        + result["depth_score"] * 0.15
        + result["confidence_score"] * 0.10
    )
    result["overall_score"] = round(overall, 1)

    # Ensure valid hire recommendation
    valid_recs = {"strong_yes", "yes", "maybe", "no", "strong_no"}
    if result.get("hire_recommendation") not in valid_recs:
        # Infer from overall score
        if overall >= 80:
            result["hire_recommendation"] = "strong_yes"
        elif overall >= 65:
            result["hire_recommendation"] = "yes"
        elif overall >= 50:
            result["hire_recommendation"] = "maybe"
        elif overall >= 35:
            result["hire_recommendation"] = "no"
        else:
            result["hire_recommendation"] = "strong_no"

    # Ensure lists
    result.setdefault("strengths", [])
    result.setdefault("red_flags", [])
    result.setdefault("skill_gap_confirmed", {})
    result.setdefault("summary_report", "")

    # Store raw response for audit
    result["raw_llm_response"] = response.text

    return result
