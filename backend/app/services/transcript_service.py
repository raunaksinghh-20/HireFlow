"""Transcript Service — JSONB array operations for interview turns."""
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db_models import Transcript


async def ensure_transcript(db: AsyncSession, interview_id: UUID) -> Transcript:
    """Get or create a transcript for an interview."""
    result = await db.execute(
        select(Transcript).where(Transcript.interview_id == interview_id)
    )
    transcript = result.scalars().first()

    if not transcript:
        transcript = Transcript(
            interview_id=interview_id,
            turns=[],
            total_turns=0,
            word_count=0,
        )
        db.add(transcript)
        await db.flush()

    return transcript


async def save_turn(db: AsyncSession, interview_id: UUID, turn_data: dict) -> None:
    """
    Append a single turn to the transcript.
    turn_data = {
        turn, role, content, question_type, difficulty, answer_score, timestamp
    }
    """
    transcript = await ensure_transcript(db, interview_id)

    # Append turn
    current_turns = list(transcript.turns or [])
    current_turns.append(turn_data)
    transcript.turns = current_turns
    transcript.total_turns = len(current_turns)

    # Update word count
    content = turn_data.get("content", "")
    transcript.word_count = (transcript.word_count or 0) + len(content.split())

    await db.flush()


async def get_transcript(db: AsyncSession, interview_id: UUID) -> Transcript | None:
    """Fetch transcript by interview_id."""
    result = await db.execute(
        select(Transcript).where(Transcript.interview_id == interview_id)
    )
    return result.scalars().first()


async def finalize_transcript(
    db: AsyncSession,
    interview_id: UUID,
    started_at: datetime | None,
    ended_at: datetime | None,
) -> None:
    """Calculate and update duration_seconds on interview completion."""
    transcript = await get_transcript(db, interview_id)
    if transcript and started_at and ended_at:
        duration = int((ended_at - started_at).total_seconds())
        transcript.duration_seconds = max(0, duration)
        await db.flush()
