import json
import logging
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.db_models import Interview, InterviewState as DBInterviewState, Resume, Job
from app.core.llm_client import generate_text

logger = logging.getLogger(__name__)

# ── Shared Interviewer Persona ─────────────────────────────────
SHARED_INTERVIEWER_PERSONA = """You are HireFlow AI, an elite technical interviewer.
Your tone is professional, encouraging, yet rigorous.
Keep your questions concise (max 2 sentences).
Do not repeat topics already covered or ask questions that contradict candidate claims.
Focus on extracting depth and assessing actual hands-on capability."""

# ── Pydantic Schemas ───────────────────────────────────────────

class TurnSummary(BaseModel):
    turn_number: int
    llm_provider: str
    question: str
    answer: str
    topic: str
    score: float | None = None
    follow_up_needed: bool = False

class CandidateClaim(BaseModel):
    claim_text: str
    topic: str
    verified: bool = False
    turn_made: int

class TurnEvaluation(BaseModel):
    updated_topic_status: Literal["not_started", "partial", "completed"]
    new_claims: List[CandidateClaim] = Field(default_factory=list)
    score: Optional[float] = None
    next_recommended_topic: Optional[str] = None

class AssembledContext(BaseModel):
    persona: str
    candidate_profile: Dict[str, Any]
    resume_context: List[str]
    jd_context: List[str]
    recent_turns: List[TurnSummary]
    rolling_summary: str
    topic_coverage: Dict[str, str]
    pending_claim_followups: List[CandidateClaim]


# ── State Update & Evaluation Functions ───────────────────────

async def get_or_create_interview_state(db: AsyncSession, interview_id: str) -> DBInterviewState:
    """Retrieve existing interview state or create a blank one."""
    from uuid import UUID
    uid = UUID(interview_id)
    result = await db.execute(select(DBInterviewState).where(DBInterviewState.interview_id == uid))
    db_state = result.scalars().first()
    if not db_state:
        db_state = DBInterviewState(
            interview_id=uid,
            current_topic=None,
            topic_coverage={},
            candidate_claims=[],
            rolling_summary="",
            recent_turns=[],
            candidate_profile={"strong_topics": [], "weak_topics": [], "scores": {}},
            turn_count=0
        )
        db.add(db_state)
        await db.flush()
    return db_state


async def evaluate_turn(question: str, answer: str, current_topic: str, turn_number: int) -> TurnEvaluation:
    """Evaluate candidate turn to extract claims, update topic status, and score capability."""
    prompt = f"""Analyze the following interview interaction.
Question: "{question}"
Answer: "{answer}"
Current Topic: "{current_topic}"

Extract the following structured JSON output:
{{
    "updated_topic_status": "completed" | "partial" | "not_started",
    "new_claims": [
        {{
            "claim_text": "e.g., has 2 years of experience with Kafka in production",
            "topic": "{current_topic}",
            "verified": true | false
        }}
    ],
    "score": 0.0 to 100.0,
    "next_recommended_topic": "suggested next topic or null"
}}

Rules:
1. updated_topic_status: "completed" if candidate showed strong mastery, "partial" if they answered but need follow-up/gaps exist, "not_started" if they couldn't answer.
2. new_claims: Extract concrete factual claims about experience/tech stacks mentioned in the answer. Set verified=true if they successfully defended it.
3. score: Score quality of candidate's technical depth (0-100).
4. Output ONLY valid JSON. No markdown code blocks.
"""
    try:
        response = await generate_text(prompt, temperature=0.1)
        from app.core.interview_graph import _parse_json_response
        data = _parse_json_response(response)
        
        claims = []
        for c in data.get("new_claims", []):
            claims.append(CandidateClaim(
                claim_text=c.get("claim_text", ""),
                topic=c.get("topic", current_topic),
                verified=c.get("verified", False),
                turn_made=turn_number
            ))
            
        return TurnEvaluation(
            updated_topic_status=data.get("updated_topic_status", "partial"),
            new_claims=claims,
            score=data.get("score"),
            next_recommended_topic=data.get("next_recommended_topic")
        )
    except Exception as e:
        logger.error(f"Error evaluating turn: {e}")
        return TurnEvaluation(updated_topic_status="partial", new_claims=[], score=50.0)


async def update_interview_state(db: AsyncSession, interview_id: str, new_turn: TurnSummary, evaluation: TurnEvaluation) -> DBInterviewState:
    """Updates interview state in place, folds older turns into a rolling summary when history grows."""
    db_state = await get_or_create_interview_state(db, interview_id)
    
    # Update current topic
    db_state.current_topic = evaluation.next_recommended_topic or new_turn.topic
    
    # Update topic coverage
    coverage = dict(db_state.topic_coverage or {})
    coverage[new_turn.topic] = evaluation.updated_topic_status
    db_state.topic_coverage = coverage
    
    # Append candidate claims
    claims = list(db_state.candidate_claims or [])
    for claim in evaluation.new_claims:
        claims.append(claim.model_dump())
    db_state.candidate_claims = claims
    
    # Update profile scores
    profile = dict(db_state.candidate_profile or {})
    scores = profile.setdefault("scores", {})
    scores[new_turn.topic] = evaluation.score
    
    # Determine strengths / weaknesses
    strong = profile.setdefault("strong_topics", [])
    weak = profile.setdefault("weak_topics", [])
    if evaluation.score is not None:
        if evaluation.score >= 75 and new_turn.topic not in strong:
            strong.append(new_turn.topic)
        elif evaluation.score < 50 and new_turn.topic not in weak:
            weak.append(new_turn.topic)
    db_state.candidate_profile = profile
    
    # Append recent turns
    recent = list(db_state.recent_turns or [])
    recent.append(new_turn.model_dump())
    db_state.recent_turns = recent
    db_state.turn_count += 1

    # Rolling summarization trigger: compress older turns into rolling summary if > 5
    if len(db_state.recent_turns) > 5:
        to_summarize = db_state.recent_turns[:-3]
        db_state.recent_turns = db_state.recent_turns[-3:]
        
        summary_prompt = f"""Existing summary: {db_state.rolling_summary}
New turns to fold in: {json.dumps(to_summarize)}

Produce an updated rolling summary (3-5 sentences) capturing what topics were covered, key strengths/weaknesses observed, and any unresolved follow-ups needed. Do not output anything other than the summary text."""
        try:
            compressed = await generate_text(summary_prompt, temperature=0.2)
            db_state.rolling_summary = compressed.strip()
        except Exception as e:
            logger.error(f"Error generating rolling summary: {e}")

    await db.flush()
    return db_state


# ── Context Builder (Assembly Layer) ───────────────────────────

def estimate_tokens(text: str) -> int:
    """Rough character-based token estimator (approx 4 chars per token)."""
    return len(text) // 4


async def build_context(db: AsyncSession, interview_id: str) -> AssembledContext:
    """Assembles structured context payload for the next LLM call under strict token budget."""
    from uuid import UUID
    uid = UUID(interview_id)
    
    # Load interview
    result = await db.execute(select(Interview).where(Interview.id == uid))
    interview = result.scalars().first()
    if not interview:
        raise ValueError("Interview not found")
        
    # Load state
    state = await get_or_create_interview_state(db, interview_id)
    
    # Load resume & job
    res_result = await db.execute(select(Resume).where(Resume.id == interview.resume_id))
    resume = res_result.scalars().first()
    job_result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = job_result.scalars().first()
    
    # Topic matching filter (cheap version)
    current_topic = state.current_topic or "general"
    
    resume_chunks = []
    if resume and resume.structured_resume:
        sr = resume.structured_resume
        # Include skills and matching projects
        resume_chunks.append(f"Candidate Skills: {', '.join(sr.get('skills', []))}")
        for proj in sr.get("projects", []):
            if current_topic.lower() in str(proj).lower():
                resume_chunks.append(f"Relevant Project: {proj.get('title')} - {proj.get('description')} (Stack: {', '.join(proj.get('tech_stack', []))})")
    
    jd_chunks = []
    if job and job.structured_jd:
        sj = job.structured_jd
        jd_chunks.append(f"Required Skills: {', '.join(sj.get('required_skills', []))}")
        for resp in sj.get("responsibilities", []):
            if current_topic.lower() in resp.lower():
                jd_chunks.append(f"Relevant Responsibility: {resp}")

    # Build Assembled Context
    recent_turns_objects = [TurnSummary(**t) for t in (state.recent_turns or [])]
    pending_claims = [CandidateClaim(**c) for c in (state.candidate_claims or []) if not c.get("verified")]
    
    payload = AssembledContext(
        persona=SHARED_INTERVIEWER_PERSONA,
        candidate_profile=state.candidate_profile or {},
        resume_context=resume_chunks,
        jd_context=jd_chunks,
        recent_turns=recent_turns_objects,
        rolling_summary=state.rolling_summary or "",
        topic_coverage=state.topic_coverage or {},
        pending_claim_followups=pending_claims
    )
    
    # Enforce budget: if estimated tokens exceed budget, compress/drop
    MAX_BUDGET = 2000  # tokens
    while estimate_tokens(payload.model_dump_json()) > MAX_BUDGET and len(payload.recent_turns) > 2:
        # Drop oldest turn from assembled view (but leave DB unchanged)
        payload.recent_turns.pop(0)
        
    return payload
