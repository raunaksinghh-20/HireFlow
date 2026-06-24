"""
LangGraph Interview Engine — Stateful Graph-Based Adaptive Interviewer

Defines the interview state machine with nodes for:
- generate_question: Creates the next question via multi-provider LLM
- analyze_answer: Evaluates answer quality and routes
- route_next: Conditional routing based on analysis
"""
import json
import re
from typing import TypedDict, Optional, Literal
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException, status

from app.config.settings import settings
from app.core.prompt_templates import (
    FIRST_QUESTION_PROMPT,
    ANALYZE_ANSWER_PROMPT,
    NEXT_QUESTION_PROMPT,
    STRUCTURED_FIRST_QUESTION_PROMPT,
    STRUCTURED_NEXT_QUESTION_PROMPT,
)
from app.core.rag_builder import build_interview_context, build_answer_analysis_context
from app.core.llm_client import generate_text, AllProvidersExhaustedError


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


async def generate_json_with_retry(prompt: str, expected_keys: list, retries: int = 3, temperature: float = 0.2) -> dict:
    """Generate text and parse as JSON, with retries on schema invalidation."""
    import logging
    for attempt in range(retries):
        try:
            response_text = await generate_text(prompt, temperature=temperature)
            result = _parse_json_response(response_text)
            if result and all(k in result for k in expected_keys):
                return result
            logging.getLogger(__name__).warning(
                f"JSON validation failed (attempt {attempt + 1}/{retries}). Expected keys: {expected_keys}. Got: {list(result.keys()) if result else 'None'}"
            )
        except Exception as e:
            logging.getLogger(__name__).warning(f"Error during JSON generation attempt {attempt + 1}: {e}")
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

async def generate_first_question(state: dict, db: AsyncSession = None) -> dict:
    """Generate the opening interview question."""
    if settings.USE_STRUCTURED_CONTEXT and db is not None:
        from app.core.context_builder import build_context
        
        # Build context
        assembled = await build_context(db, state["interview_id"])
        
        # Format prompt
        prompt = STRUCTURED_FIRST_QUESTION_PROMPT.format(
            persona=assembled.persona,
            candidate_profile=json.dumps(assembled.candidate_profile),
            resume_context="\n".join(assembled.resume_context),
            jd_context="\n".join(assembled.jd_context)
        )
        
        # Generate and parse
        result = await generate_json_with_retry(prompt, ["question", "question_type", "target_skill"], retries=3)
        target_skill = result.get("target_skill", "general")
        
        # Update current topic in DB state
        from app.core.context_builder import get_or_create_interview_state
        db_state = await get_or_create_interview_state(db, state["interview_id"])
        db_state.current_topic = target_skill
        await db.flush()
        
        # Sync current topic back into Redis state
        state["current_topic"] = target_skill
        
        return {
            "question": result.get("question", "Tell me about your most relevant experience for this role."),
            "question_type": result.get("question_type", "technical_opening"),
            "target_skill": target_skill,
        }

    context = build_interview_context(state)
    prompt = FIRST_QUESTION_PROMPT.format(**context)

    try:
        response_text = await generate_text(prompt)
    except AllProvidersExhaustedError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="All AI providers are rate-limited. Please wait a minute before starting another interview."
        )

    result = _parse_json_response(response_text)

    return {
        "question": result.get("question", "Tell me about your most relevant experience for this role."),
        "question_type": result.get("question_type", "technical_opening"),
        "target_skill": result.get("target_skill", ""),
    }


async def analyze_answer(state: dict, answer: str, db: AsyncSession = None) -> dict:
    """Analyze a candidate's answer and determine routing."""
    if settings.USE_STRUCTURED_CONTEXT and db is not None:
        from app.core.context_builder import evaluate_turn, update_interview_state, TurnSummary
        
        # Get last turn question, topic, etc.
        last_question = ""
        last_topic = "general"
        for turn in reversed(state.get("conversation_history", [])):
            if turn.get("role") == "interviewer":
                last_question = turn.get("content", "")
                last_topic = turn.get("question_type") or "general"
                break
                
        turn_number = len(state.get("conversation_history", [])) // 2
        
        # Evaluate turn using the new logic
        evaluation = await evaluate_turn(last_question, answer, last_topic, turn_number)
        
        # Save this answer and evaluation to the interview state
        new_turn = TurnSummary(
            turn_number=turn_number,
            llm_provider="Gemini",
            question=last_question,
            answer=answer,
            topic=last_topic,
            score=evaluation.score,
            follow_up_needed=(evaluation.updated_topic_status == "partial")
        )
        
        await update_interview_state(db, state["interview_id"], new_turn, evaluation)
        
        # Map structured evaluation to standard return format
        routing = "next_topic"
        if evaluation.updated_topic_status == "partial":
            routing = "follow_up"
            
        # Force completion if at question limit
        if state.get("question_count", 0) >= state.get("max_questions", 8) - 1:
            routing = "complete"
            
        quality = "adequate"
        if evaluation.score is not None:
            if evaluation.score >= 75:
                quality = "strong"
            elif evaluation.score < 50:
                quality = "shallow"
                
        return {
            "answer_quality": quality,
            "answer_score": min(100, max(0, int(evaluation.score or 50))),
            "routing_decision": routing,
            "detected_issues": [],
            "next_recommended_topic": evaluation.next_recommended_topic
        }

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

    try:
        response_text = await generate_text(prompt)
    except AllProvidersExhaustedError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="All AI providers are rate-limited. Please wait a minute."
        )

    result = _parse_json_response(response_text)

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


async def generate_next_question(state: dict, routing_decision: str, db: AsyncSession = None) -> dict:
    """Generate the next question based on routing decision."""
    if settings.USE_STRUCTURED_CONTEXT and db is not None:
        from app.core.context_builder import build_context
        
        assembled = await build_context(db, state["interview_id"])
        
        # Format prompt
        prompt = STRUCTURED_NEXT_QUESTION_PROMPT.format(
            persona=assembled.persona,
            candidate_profile=json.dumps(assembled.candidate_profile),
            resume_context="\n".join(assembled.resume_context),
            jd_context="\n".join(assembled.jd_context),
            topic_coverage=json.dumps(assembled.topic_coverage),
            pending_claim_followups=json.dumps([c.model_dump() for c in assembled.pending_claim_followups]),
            rolling_summary=assembled.rolling_summary,
            recent_turns=json.dumps([t.model_dump() for t in assembled.recent_turns]),
            difficulty_level=state.get("difficulty_level", 1),
            question_count=state.get("question_count", 0),
            questions_remaining=state.get("max_questions", 8) - state.get("question_count", 0)
        )
        
        result = await generate_json_with_retry(prompt, ["question", "question_type"], retries=3)
        
        difficulty_change = result.get("difficulty_change", 0)
        new_difficulty = max(1, min(5, state.get("difficulty_level", 1) + difficulty_change))
        
        # Update current topic in DB state
        target_skill = result.get("target_skill", state.get("current_topic", "general"))
        from app.core.context_builder import get_or_create_interview_state
        db_state = await get_or_create_interview_state(db, state["interview_id"])
        db_state.current_topic = target_skill
        await db.flush()
        
        # Sync current topic back into Redis state
        state["current_topic"] = target_skill
        
        return {
            "question": result.get("question", "Can you elaborate on that?"),
            "question_type": result.get("question_type", routing_decision),
            "target_skill": target_skill,
            "new_difficulty": new_difficulty,
        }

    context = build_interview_context(state)
    context["routing_decision"] = routing_decision

    prompt = NEXT_QUESTION_PROMPT.format(**context)

    try:
        response_text = await generate_text(prompt)
    except AllProvidersExhaustedError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="All AI providers are rate-limited. Please wait a minute."
        )

    result = _parse_json_response(response_text)

    # Adjust difficulty
    difficulty_change = result.get("difficulty_change", 0)
    new_difficulty = max(1, min(5, state.get("difficulty_level", 1) + difficulty_change))

    return {
        "question": result.get("question", "Can you elaborate on that?"),
        "question_type": result.get("question_type", routing_decision),
        "target_skill": result.get("target_skill", ""),
        "new_difficulty": new_difficulty,
    }


# ── LangGraph Integration ────────────────────────────────────────

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False


def create_interview_graph():
    """Create and return a LangGraph StateGraph for interview flow."""
    if not LANGGRAPH_AVAILABLE:
        return None
    
    graph = StateGraph(InterviewState)
    
    # Add nodes (using existing functions)
    graph.add_node("generate_first_question", generate_first_question)
    graph.add_node("analyze_answer", analyze_answer)
    graph.add_node("generate_next_question", generate_next_question)
    
    # Set entry point
    graph.set_entry_point("generate_first_question")
    
    # Add edges
    graph.add_edge("generate_first_question", "analyze_answer")
    graph.add_conditional_edges(
        "analyze_answer",
        lambda x: x.get("routing_decision", "next_topic"),
        {
            "follow_up": "generate_next_question",
            "gap_probe": "generate_next_question",
            "challenge": "generate_next_question",
            "escalate": "generate_next_question",
            "next_topic": "generate_next_question",
            "complete": END,
        }
    )
    graph.add_edge("generate_next_question", END)
    
    return graph.compile()


# Cache compiled graph
_interview_graph = None


def get_interview_graph():
    """Get or create the compiled interview graph."""
    global _interview_graph
    if _interview_graph is None and LANGGRAPH_AVAILABLE:
        _interview_graph = create_interview_graph()
    return _interview_graph
