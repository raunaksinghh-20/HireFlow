"""Evaluation Service — Generates structured AI evaluation of completed interviews."""
import json
import re

from google import genai

from app.config.settings import settings
from app.models.db_models import Interview, Transcript, Resume, Job
from app.core.prompt_templates import (
    TECHNICAL_AGENT_PROMPT,
    COMMUNICATION_AGENT_PROMPT,
    HR_AGENT_PROMPT,
    CONSENSUS_BUILDER_PROMPT,
)
from app.core.rag_builder import build_evaluation_context
import asyncio


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
    Multi-Agent Consensus Evaluation:
    1. Runs Technical Agent, Communication Agent, and HR Agent in parallel.
    2. Synthesizes findings using a Consensus Aggregator.
    Returns the final unified evaluation dictionary.
    """
    # Build core context
    context = build_evaluation_context(
        resume_text=resume.extracted_text or "",
        jd_text=job.description or "",
        required_skills=job.required_skills or [],
        experience_years=job.experience_years or 0,
        ats_score=resume.ats_score or 0,
        skill_gaps=resume.skill_gaps or [],
        transcript_turns=transcript.turns or [],
    )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Helper function to invoke Gemini in a separate thread
    async def call_gemini(prompt: str) -> str:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        return response.text

    # Build prompts for individual specialist agents
    tech_prompt = TECHNICAL_AGENT_PROMPT.format(**context)
    comm_prompt = COMMUNICATION_AGENT_PROMPT.format(**context)
    hr_prompt = HR_AGENT_PROMPT.format(**context)

    # Run agents in parallel to minimize latency
    tech_res, comm_res, hr_res = await asyncio.gather(
        call_gemini(tech_prompt),
        call_gemini(comm_prompt),
        call_gemini(hr_prompt),
        return_exceptions=True
    )

    # Handle any potential exceptions
    tech_report = tech_res if not isinstance(tech_res, Exception) else f"Error: {tech_res}"
    comm_report = comm_res if not isinstance(comm_res, Exception) else f"Error: {comm_res}"
    hr_report = hr_res if not isinstance(hr_res, Exception) else f"Error: {hr_res}"

    # Build consensus synthesis prompt
    consensus_prompt = CONSENSUS_BUILDER_PROMPT.format(
        jd_text=job.description or "",
        resume_text=resume.extracted_text or "",
        technical_report=tech_report,
        communication_report=comm_report,
        hr_report=hr_report,
    )

    # Run synthesis
    consensus_text = await call_gemini(consensus_prompt)
    result = _parse_json_response(consensus_text)

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
    result["raw_llm_response"] = consensus_text

    return result
