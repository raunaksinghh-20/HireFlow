"""
LangGraph Interview Engine — Stateful Graph-Based Adaptive Interviewer

Defines the interview state machine with nodes for:
- generate_question: Creates the next question via Gemini
- analyze_answer: Evaluates answer quality and routes
- route_next: Conditional routing based on analysis
"""
import json
import re
from typing import TypedDict, Optional, Literal

from google import genai
from google.genai.errors import ClientError
from fastapi import HTTPException, status

from app.config.settings import settings
from app.core.prompt_templates import (
    FIRST_QUESTION_PROMPT,
    ANALYZE_ANSWER_PROMPT,
    NEXT_QUESTION_PROMPT,
)
from app.core.rag_builder import build_interview_context, build_answer_analysis_context


# ── Gemini Client ────────────────────────────────────────────────

def _get_gemini_client():
    """Get a Gemini client instance."""
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _parse_json_response(text: str) -> dict:
    """Extract JSON from an LLM response, handling markdown code fences."""
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence (with optional language specifier)
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```\s*$", "", text)
    
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Try to find JSON object in text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    
    # Return a safe default
    return {}


# ── Interview State ──────────────────────────────────────────────

class InterviewState(TypedDict):
    interview_id: str
    resume_id: str
    job_id: str
    candidate_name: str
    job_title: str
    resume_text: str
    jd_text: str
    required_skills: list
    ats_score: int
    skill_gaps: list
    matched_skills: list
    conversation_history: list
    current_question_type: str
    difficulty_level: int
    question_count: int
    max_questions: int
    answer_scores: list
    session_complete: bool


# ── Graph Nodes ──────────────────────────────────────────────────

async def generate_first_question(state: dict) -> dict:
    """Generate the opening interview question."""
    client = _get_gemini_client()
    context = build_interview_context(state)

    prompt = FIRST_QUESTION_PROMPT.format(**context)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
    except ClientError as e:
        if "429" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Gemini API rate limit exceeded. Please wait a minute before starting another interview."
            )
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

    result = _parse_json_response(response.text)

    return {
        "question": result.get("question", "Tell me about your most relevant experience for this role."),
        "question_type": result.get("question_type", "technical_opening"),
        "target_skill": result.get("target_skill", ""),
    }


async def analyze_answer(state: dict, answer: str) -> dict:
    """Analyze a candidate's answer and determine routing."""
    client = _get_gemini_client()

    # Get the last question from conversation history
    last_question = ""
    last_question_type = ""
    for turn in reversed(state.get("conversation_history", [])):
        if turn.get("role") == "interviewer":
            last_question = turn.get("content", "")
            last_question_type = turn.get("question_type", "")
            break

    context = build_answer_analysis_context(state, last_question, answer)
    context["question_type"] = last_question_type

    prompt = ANALYZE_ANSWER_PROMPT.format(**context)

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    result = _parse_json_response(response.text)

    # Ensure valid routing decision
    valid_routes = {"follow_up", "gap_probe", "challenge", "escalate", "next_topic", "complete"}
    routing = result.get("routing_decision", "next_topic")
    if routing not in valid_routes:
        routing = "next_topic"

    # Force completion if at question limit
    if state.get("question_count", 0) >= state.get("max_questions", 8) - 1:
        routing = "complete"

    return {
        "answer_quality": result.get("answer_quality", "adequate"),
        "answer_score": min(100, max(0, result.get("answer_score", 50))),
        "routing_decision": routing,
        "detected_issues": result.get("detected_issues", []),
    }


async def generate_next_question(state: dict, routing_decision: str) -> dict:
    """Generate the next question based on routing decision."""
    client = _get_gemini_client()
    context = build_interview_context(state)
    context["routing_decision"] = routing_decision

    prompt = NEXT_QUESTION_PROMPT.format(**context)

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    result = _parse_json_response(response.text)

    # Adjust difficulty
    difficulty_change = result.get("difficulty_change", 0)
    new_difficulty = max(1, min(5, state.get("difficulty_level", 1) + difficulty_change))

    return {
        "question": result.get("question", "Can you elaborate on that?"),
        "question_type": result.get("question_type", routing_decision),
        "target_skill": result.get("target_skill", ""),
        "new_difficulty": new_difficulty,
    }
