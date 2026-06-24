"""Interview Service — Orchestrates the interview flow."""
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db_models import Interview
from app.core.interview_graph import generate_first_question, analyze_answer, generate_next_question
from app.core import session_manager


async def start_interview_session(
    db: AsyncSession, state: dict
) -> tuple[dict, str]:
    """
    Initialize interview: store state in Redis, generate first question.
    Returns (first_question_data, session_token).
    """
    # Store state in Redis
    session_token = await session_manager.create_session(state)

    # Generate first question via Gemini (passing db)
    question_data = await generate_first_question(state, db)

    # Append the first question to conversation history
    state["conversation_history"].append({
        "turn": 0,
        "role": "interviewer",
        "content": question_data["question"],
        "question_type": question_data["question_type"],
        "difficulty": state["difficulty_level"],
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Update Redis with the first question added
    await session_manager.update_session(session_token, state)

    return question_data, session_token


async def process_answer(state: dict, answer: str, db: AsyncSession = None) -> dict:
    """
    Process a candidate's answer:
    1. Analyze the answer quality
    2. Generate the next question (if not complete)
    Returns the full response data.
    """
    # Analyze the answer
    analysis = await analyze_answer(state, answer, db)

    question_count = state.get("question_count", 0)
    max_questions = state.get("max_questions", 8)

    # Check completion
    is_complete = (
        analysis["routing_decision"] == "complete"
        or question_count >= max_questions
    )

    next_question_data = None
    if not is_complete:
        # Generate next question
        next_question_data = await generate_next_question(state, analysis["routing_decision"], db)
        state["difficulty_level"] = next_question_data.get("new_difficulty", state["difficulty_level"])

    state["session_complete"] = is_complete

    return {
        "analysis": analysis,
        "next_question": next_question_data,
        "is_complete": is_complete,
    }


async def close_interview(db: AsyncSession, interview_id: UUID, session_token: str) -> None:
    """Mark interview as completed and destroy Redis session."""
    result = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result.scalars().first()
    if interview:
        interview.status = "completed"
        interview.ended_at = datetime.now(timezone.utc)
        await db.flush()

    # Destroy Redis session
    await session_manager.delete_session(session_token)
