from uuid import UUID
from datetime import datetime, timezone
from typing import List

import sqlalchemy
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User, Resume, Job, Interview, Transcript, Evaluation, Application, ScheduledInterview
from app.schemas.all_schemas import (
    StartInterviewRequest, StartInterviewResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
    QuitInterviewRequest, QuitInterviewResponse,
    TranscriptOut, TranscriptTurnOut,
    EvaluationRequest, EvaluationOut, InterviewOut,
    RescheduleRequest,
)
from app.services.interview_service import start_interview_session, process_answer, close_interview
from app.services.transcript_service import save_turn, get_transcript, finalize_transcript, ensure_transcript
from app.services.evaluation_service import generate_evaluation
from app.services.deepgram_service import generate_tts, transcribe_audio
from app.core import session_manager
import base64
from fastapi import File, Form, UploadFile

router = APIRouter(tags=["Interviews"])


async def _mark_application_interviewed(db: AsyncSession, resume_id: UUID, job_id: UUID) -> None:
    result = await db.execute(
        select(Application).where(
            (Application.resume_id == resume_id) &
            (Application.job_id == job_id)
        )
    )
    application = result.scalars().first()
    if application and application.status in {"approved", "shortlisted", "interview_scheduled"}:
        application.status = "interviewed"


async def _abandon_other_active_interviews(
    db: AsyncSession,
    interview_id: UUID,
    resume_id: UUID,
    job_id: UUID,
) -> None:
    result = await db.execute(
        select(Interview).where(
            (Interview.id != interview_id) &
            (Interview.resume_id == resume_id) &
            (Interview.job_id == job_id) &
            (Interview.status == "active")
        )
    )
    for stale_interview in result.scalars().all():
        stale_interview.status = "abandoned"
        stale_interview.ended_at = datetime.now(timezone.utc)


@router.post("/start-interview", response_model=StartInterviewResponse, status_code=status.HTTP_201_CREATED)
async def start_interview(
    payload: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initialize a stateful AI interview session. Returns the first question."""
    # Fetch resume
    result = await db.execute(select(Resume).where(Resume.id == payload.resume_id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    # Check ATS score exists
    if resume.ats_score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Run /ats-score before starting an interview",
        )

    # Check if there is already a completed interview for this resume and job
    comp_result = await db.execute(
        select(Interview).where(
            (Interview.resume_id == payload.resume_id) &
            (Interview.job_id == payload.job_id) &
            (Interview.status == "completed")
        )
    )
    if comp_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INTERVIEW_ALREADY_COMPLETED|You have already completed the interview for this position.",
        )

    # Fetch job
    result = await db.execute(select(Job).where(Job.id == payload.job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Enforce strict scheduling bounds if scheduled
    sched_result = await db.execute(
        select(ScheduledInterview).where(
            (ScheduledInterview.job_id == payload.job_id) &
            (ScheduledInterview.candidate_username == current_user.username)
        ).order_by(ScheduledInterview.created_at.desc())
    )
    scheduled_interview = sched_result.scalars().first()
    
    if scheduled_interview and scheduled_interview.status == "scheduled":
        now = datetime.now(timezone.utc)
        # Ensure start_time is timezone aware
        start_time = scheduled_interview.scheduled_time
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
            
        diff_minutes = (now - start_time).total_seconds() / 60.0
        
        if diff_minutes < -10:
            formatted_time = start_time.strftime('%I:%M %p')
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"TOO_EARLY|Your interview is scheduled for {formatted_time}. Please return within 10 minutes of the start time."
            )
        elif diff_minutes > 60:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MISSED_INTERVIEW|You missed your scheduled interview time. Please request a reschedule."
            )

    # Create Interview record
    interview = Interview(
        resume_id=resume.id,
        job_id=job.id,
        created_by=current_user.id,
        status="active",
        mode=payload.mode,
        max_questions=payload.max_questions,
        started_at=datetime.now(timezone.utc),
    )
    db.add(interview)
    await db.flush()

    # Build initial state
    state = {
        "interview_id": str(interview.id),
        "resume_id": str(resume.id),
        "job_id": str(job.id),
        "candidate_name": resume.candidate_name,
        "job_title": job.title,
        "resume_text": resume.extracted_text or "",
        "jd_text": job.description,
        "required_skills": job.required_skills or [],
        "ats_score": resume.ats_score,
        "skill_gaps": resume.skill_gaps or [],
        "matched_skills": resume.matched_skills or [],
        "conversation_history": [],
        "current_question_type": "opening",
        "difficulty_level": 1,
        "question_count": 0,
        "max_questions": payload.max_questions,
        "answer_scores": [],
        "session_complete": False,
        "mode": payload.mode,
    }

    from app.config.settings import settings
    has_any_llm_key = any([
        settings.GEMINI_API_KEY,
        settings.GROQ_API_KEY,
        settings.OPENROUTER_API_KEY,
        settings.CEREBRAS_API_KEY,
        settings.COHERE_API_KEY,
    ])
    if not has_any_llm_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No LLM API key configured in backend/.env. Add at least one of: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, CEREBRAS_API_KEY, COHERE_API_KEY."
        )

    # Generate first question and store in Redis
    question_data, session_token = await start_interview_session(db, state)

    # Update interview with session token
    interview.session_token = session_token
    await db.flush()

    # Save first question turn to transcript
    await save_turn(db, interview.id, {
        "turn": 0,
        "role": "interviewer",
        "content": question_data["question"],
        "question_type": question_data["question_type"],
        "difficulty": 1,
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    audio_base64 = None
    if payload.mode == "voice":
        audio_bytes = await generate_tts(question_data["question"])
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    return StartInterviewResponse(
        interview_id=interview.id,
        session_token=session_token,
        first_question=question_data["question"],
        question_type=question_data["question_type"],
        difficulty_level=1,
        candidate_name=resume.candidate_name,
        job_title=job.title,
        total_questions_planned=payload.max_questions,
        audio_base64=audio_base64,
        message="Interview started. Submit answers to /transcript.",
    )


@router.post("/transcript", response_model=SubmitAnswerResponse)
async def submit_answer(
    payload: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a candidate answer. Receive the next question or completion signal."""
    # Load state from Redis
    state = await session_manager.get_session(payload.session_token)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session expired or not found",
        )

    # Check if already complete
    if state.get("session_complete"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interview already completed",
        )

    interview_id = UUID(state["interview_id"])

    # Append candidate answer to conversation history
    answer_turn = {
        "turn": payload.turn,
        "role": "candidate",
        "content": payload.answer,
        "question_type": None,
        "difficulty": None,
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    state["conversation_history"].append(answer_turn)

    # Process the answer (analyze + generate next question)
    result = await process_answer(state, payload.answer, db)
    analysis = result["analysis"]

    # Update answer score in the turn
    answer_turn["answer_score"] = analysis["answer_score"]

    # Update state
    state["question_count"] = state.get("question_count", 0) + 1
    state["answer_scores"].append(analysis["answer_score"])

    # Save candidate answer turn to DB
    await save_turn(db, interview_id, answer_turn)

    if result["is_complete"]:
        # Close interview
        await close_interview(db, interview_id, payload.session_token)
        await _abandon_other_active_interviews(
            db,
            interview_id,
            UUID(state["resume_id"]),
            UUID(state["job_id"]),
        )
        await _mark_application_interviewed(
            db,
            UUID(state["resume_id"]),
            UUID(state["job_id"]),
        )
        await finalize_transcript(
            db, interview_id,
            started_at=None,
            ended_at=datetime.now(timezone.utc),
        )

        return SubmitAnswerResponse(
            turn=payload.turn,
            answer_quality=analysis["answer_quality"],
            next_question=None,
            question_type=None,
            difficulty_level=state["difficulty_level"],
            interview_complete=True,
            questions_remaining=0,
            message="Interview complete. Call /evaluation to generate the candidate evaluation.",
        )

    # Not complete — we have a next question
    next_q = result["next_question"]
    question_turn = {
        "turn": payload.turn + 1,
        "role": "interviewer",
        "content": next_q["question"],
        "question_type": next_q["question_type"],
        "difficulty": state["difficulty_level"],
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    state["conversation_history"].append(question_turn)
    state["current_question_type"] = next_q["question_type"]

    # Update Redis
    await session_manager.update_session(payload.session_token, state)

    # Save interviewer question turn to DB
    await save_turn(db, interview_id, question_turn)

    # Update interview record
    result_interview = await db.execute(
        select(Interview).where(Interview.id == interview_id)
    )
    interview = result_interview.scalars().first()
    if interview:
        interview.difficulty_level = state["difficulty_level"]
        interview.total_questions = state["question_count"]
        await db.flush()

    questions_remaining = state["max_questions"] - state["question_count"]

    return SubmitAnswerResponse(
        turn=payload.turn,
        answer_quality=analysis["answer_quality"],
        next_question=next_q["question"],
        question_type=next_q["question_type"],
        difficulty_level=state["difficulty_level"],
        interview_complete=False,
        questions_remaining=max(0, questions_remaining),
        message="Answer recorded.",
    )


@router.post("/interview/quit", response_model=QuitInterviewResponse)
async def quit_interview(
    payload: QuitInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End an active interview early so evaluation can use the saved progress."""
    state = await session_manager.get_session(payload.session_token)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session expired or not found",
        )

    interview_id = UUID(state["interview_id"])

    await close_interview(db, interview_id, payload.session_token)
    await _abandon_other_active_interviews(
        db,
        interview_id,
        UUID(state["resume_id"]),
        UUID(state["job_id"]),
    )
    await _mark_application_interviewed(
        db,
        UUID(state["resume_id"]),
        UUID(state["job_id"]),
    )
    await finalize_transcript(
        db,
        interview_id,
        started_at=None,
        ended_at=datetime.now(timezone.utc),
    )

    return QuitInterviewResponse(
        interview_id=interview_id,
        message="Interview ended early. Generate the candidate evaluation from current progress.",
    )


@router.post("/transcript/voice", response_model=SubmitAnswerResponse)
async def submit_voice_answer(
    session_token: str = Form(...),
    turn: int = Form(...),
    audio_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a candidate voice answer. Receive transcribed text and TTS audio."""
    # 1. Transcribe audio
    audio_bytes = await audio_file.read()
    transcribed_text = await transcribe_audio(audio_bytes, audio_file.content_type)
    
    # 2. Process logic exactly like submit_answer but manually passing the payload
    # Load state from Redis
    state = await session_manager.get_session(session_token)
    if state is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session expired or not found")
    if state.get("session_complete"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interview already completed")

    interview_id = UUID(state["interview_id"])

    # Append candidate answer to conversation history
    answer_turn = {
        "turn": turn,
        "role": "candidate",
        "content": transcribed_text,
        "question_type": None,
        "difficulty": None,
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    state["conversation_history"].append(answer_turn)

    # Process the answer (analyze + generate next question)
    result = await process_answer(state, transcribed_text, db)
    analysis = result["analysis"]

    # Update answer score in the turn
    answer_turn["answer_score"] = analysis["answer_score"]

    # Update state
    state["question_count"] = state.get("question_count", 0) + 1
    state["answer_scores"].append(analysis["answer_score"])

    # Save candidate answer turn to DB
    await save_turn(db, interview_id, answer_turn)

    if result["is_complete"]:
        # Close interview
        await close_interview(db, interview_id, session_token)
        await _abandon_other_active_interviews(
            db,
            interview_id,
            UUID(state["resume_id"]),
            UUID(state["job_id"]),
        )
        await _mark_application_interviewed(
            db,
            UUID(state["resume_id"]),
            UUID(state["job_id"]),
        )
        await finalize_transcript(db, interview_id, started_at=None, ended_at=datetime.now(timezone.utc))

        return SubmitAnswerResponse(
            turn=turn,
            answer_quality=analysis["answer_quality"],
            next_question=None,
            question_type=None,
            difficulty_level=state["difficulty_level"],
            interview_complete=True,
            questions_remaining=0,
            message="Interview complete. Call /evaluation to generate the candidate evaluation.",
            transcribed_text=transcribed_text,
            audio_base64=None
        )

    # Not complete — we have a next question
    next_q = result["next_question"]
    question_turn = {
        "turn": turn + 1,
        "role": "interviewer",
        "content": next_q["question"],
        "question_type": next_q["question_type"],
        "difficulty": state["difficulty_level"],
        "answer_score": None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    state["conversation_history"].append(question_turn)
    state["current_question_type"] = next_q["question_type"]

    # Update Redis
    await session_manager.update_session(session_token, state)

    # Save interviewer question turn to DB
    await save_turn(db, interview_id, question_turn)

    # Update interview record
    result_interview = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result_interview.scalars().first()
    if interview:
        interview.difficulty_level = state["difficulty_level"]
        interview.total_questions = state["question_count"]
        await db.flush()

    questions_remaining = state["max_questions"] - state["question_count"]

    # 3. Generate TTS for the next question
    tts_bytes = await generate_tts(next_q["question"])
    audio_base64 = base64.b64encode(tts_bytes).decode("utf-8")

    return SubmitAnswerResponse(
        turn=turn,
        answer_quality=analysis["answer_quality"],
        next_question=next_q["question"],
        question_type=next_q["question_type"],
        difficulty_level=state["difficulty_level"],
        interview_complete=False,
        questions_remaining=max(0, questions_remaining),
        message="Answer recorded.",
        transcribed_text=transcribed_text,
        audio_base64=audio_base64
    )


@router.get("/transcript/{interview_id}", response_model=TranscriptOut)
async def get_transcript_endpoint(
    interview_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve the full formatted transcript after interview completion."""
    transcript = await get_transcript(db, interview_id)
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")

    # Fetch interview and related data
    result = await db.execute(select(Interview).where(Interview.id == interview_id))
    interview = result.scalars().first()

    result = await db.execute(select(Resume).where(Resume.id == interview.resume_id))
    resume = result.scalars().first()

    result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = result.scalars().first()

    turns = [TranscriptTurnOut(**t) for t in (transcript.turns or [])]

    return TranscriptOut(
        transcript_id=transcript.id,
        interview_id=interview_id,
        candidate_name=resume.candidate_name if resume else "Unknown",
        job_title=job.title if job else "Unknown",
        status=interview.status if interview else "unknown",
        turns=turns,
        total_turns=transcript.total_turns or 0,
        word_count=transcript.word_count or 0,
        duration_seconds=transcript.duration_seconds or 0,
        created_at=transcript.created_at,
    )


@router.post("/evaluation", response_model=EvaluationOut)
async def create_evaluation(
    payload: EvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a full structured AI evaluation of the completed interview."""
    # Fetch interview
    result = await db.execute(select(Interview).where(Interview.id == payload.interview_id))
    interview = result.scalars().first()
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    if interview.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview must be completed before evaluation",
        )

    # Fetch transcript before idempotency handling so empty-interview evaluations
    # can be corrected if an older optimistic evaluation already exists.
    transcript = await get_transcript(db, payload.interview_id)
    if not transcript:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transcript not found")

    # Check for existing evaluation (idempotent)
    result = await db.execute(
        select(Evaluation).where(Evaluation.interview_id == payload.interview_id)
    )
    existing_eval = result.scalars().first()
    if existing_eval:
        resume = (await db.execute(select(Resume).where(Resume.id == interview.resume_id))).scalars().first()
        job = (await db.execute(select(Job).where(Job.id == interview.job_id))).scalars().first()
        has_candidate_answers = any(
            turn.get("role") == "candidate" and (turn.get("content") or "").strip()
            for turn in (transcript.turns or [])
        )
        if not has_candidate_answers:
            eval_result = await generate_evaluation(interview, transcript, resume, job)
            existing_eval.technical_score = eval_result["technical_score"]
            existing_eval.communication_score = eval_result["communication_score"]
            existing_eval.consistency_score = eval_result["consistency_score"]
            existing_eval.depth_score = eval_result["depth_score"]
            existing_eval.confidence_score = eval_result["confidence_score"]
            existing_eval.overall_score = eval_result["overall_score"]
            existing_eval.strengths = eval_result["strengths"]
            existing_eval.red_flags = eval_result["red_flags"]
            existing_eval.skill_gap_confirmed = eval_result["skill_gap_confirmed"]
            existing_eval.hire_recommendation = eval_result["hire_recommendation"]
            existing_eval.summary_report = eval_result["summary_report"]
            existing_eval.raw_llm_response = {"raw": eval_result.get("raw_llm_response", "")}
            await db.flush()

        return EvaluationOut(
            evaluation_id=existing_eval.id,
            interview_id=existing_eval.interview_id,
            candidate_name=resume.candidate_name if resume else "Unknown",
            job_title=job.title if job else "Unknown",
            technical_score=existing_eval.technical_score,
            communication_score=existing_eval.communication_score,
            consistency_score=existing_eval.consistency_score,
            depth_score=existing_eval.depth_score,
            confidence_score=existing_eval.confidence_score,
            overall_score=existing_eval.overall_score,
            strengths=existing_eval.strengths or [],
            red_flags=existing_eval.red_flags or [],
            skill_gap_confirmed=existing_eval.skill_gap_confirmed or {},
            hire_recommendation=existing_eval.hire_recommendation,
            summary_report=existing_eval.summary_report or "",
            created_at=existing_eval.created_at,
        )

    # Fetch related data
    result = await db.execute(select(Resume).where(Resume.id == interview.resume_id))
    resume = result.scalars().first()

    result = await db.execute(select(Job).where(Job.id == interview.job_id))
    job = result.scalars().first()

    # Generate evaluation via Gemini
    eval_result = await generate_evaluation(interview, transcript, resume, job)

    # Create Evaluation record
    evaluation = Evaluation(
        interview_id=interview.id,
        technical_score=eval_result["technical_score"],
        communication_score=eval_result["communication_score"],
        consistency_score=eval_result["consistency_score"],
        depth_score=eval_result["depth_score"],
        confidence_score=eval_result["confidence_score"],
        overall_score=eval_result["overall_score"],
        strengths=eval_result["strengths"],
        red_flags=eval_result["red_flags"],
        skill_gap_confirmed=eval_result["skill_gap_confirmed"],
        hire_recommendation=eval_result["hire_recommendation"],
        summary_report=eval_result["summary_report"],
        raw_llm_response={"raw": eval_result.get("raw_llm_response", "")},
    )
    db.add(evaluation)
    try:
        await db.flush()
    except sqlalchemy.exc.IntegrityError:
        await db.rollback()
        # Another request beat us to it, fetch the evaluation it created
        existing = (await db.execute(select(Evaluation).where(Evaluation.interview_id == interview.id))).scalars().first()
        if existing:
            evaluation = existing

    # Trigger recruiter notification
    from app.services.notification_service import send_interview_completed_email
    if current_user.email:
        try:
            send_interview_completed_email(
                recruiter_email=current_user.email,
                candidate_name=resume.candidate_name if resume else "Candidate",
                job_title=job.title if job else "Position",
                overall_score=evaluation.overall_score
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send email to recruiter: {e}")

    return EvaluationOut(
        evaluation_id=evaluation.id,
        interview_id=interview.id,
        candidate_name=resume.candidate_name if resume else "Unknown",
        job_title=job.title if job else "Unknown",
        technical_score=evaluation.technical_score,
        communication_score=evaluation.communication_score,
        consistency_score=evaluation.consistency_score,
        depth_score=evaluation.depth_score,
        confidence_score=evaluation.confidence_score,
        overall_score=evaluation.overall_score,
        strengths=evaluation.strengths or [],
        red_flags=evaluation.red_flags or [],
        skill_gap_confirmed=evaluation.skill_gap_confirmed or {},
        hire_recommendation=evaluation.hire_recommendation,
        summary_report=evaluation.summary_report or "",
        created_at=evaluation.created_at,
    )


@router.get("/interviews/my-interviews", response_model=List[InterviewOut])
async def get_my_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all interviews scheduled or attended by the current candidate."""
    # Find interviews for resumes uploaded by the current candidate or matching their email
    query = (
        select(Interview, Job, Resume, Evaluation)
        .join(Job, Interview.job_id == Job.id)
        .join(Resume, Interview.resume_id == Resume.id)
        .outerjoin(Evaluation, Interview.id == Evaluation.interview_id)
        .where(
            (Resume.uploaded_by == current_user.id) |
            (Resume.candidate_email == current_user.email)
        )
        .order_by(Interview.created_at.desc())
    )
    result = await db.execute(query)
    results = result.all()

    out_list = []
    for interview, job, resume, evaluation in results:
        eval_out = None
        if evaluation:
            eval_out = EvaluationOut(
                evaluation_id=evaluation.id,
                interview_id=evaluation.interview_id,
                candidate_name=resume.candidate_name,
                job_title=job.title,
                technical_score=evaluation.technical_score,
                communication_score=evaluation.communication_score,
                consistency_score=evaluation.consistency_score,
                depth_score=evaluation.depth_score,
                confidence_score=evaluation.confidence_score,
                overall_score=evaluation.overall_score,
                strengths=evaluation.strengths or [],
                red_flags=evaluation.red_flags or [],
                skill_gap_confirmed=evaluation.skill_gap_confirmed or {},
                hire_recommendation=evaluation.hire_recommendation,
                summary_report=evaluation.summary_report or "",
                created_at=evaluation.created_at,
            )

        out_list.append(
            InterviewOut(
                id=interview.id,
                resume_id=interview.resume_id,
                job_id=interview.job_id,
                job_title=job.title,
                company=job.company or "Unknown",
                candidate_name=resume.candidate_name,
                candidate_email=resume.candidate_email or "",
                status=interview.status,
                mode=interview.mode,
                created_at=interview.created_at,
                evaluation_score=evaluation.overall_score if evaluation else None,
                evaluation=eval_out,
            )
        )
    return out_list


@router.get("/interviews", response_model=List[InterviewOut])
async def list_interviews(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all interviews. Non-candidates see all, candidates see their own."""
    if current_user.role == "candidate":
        # Redirect candidates to their specific route logic
        return await get_my_interviews(current_user, db)

    query = (
        select(Interview, Job, Resume, Evaluation)
        .join(Job, Interview.job_id == Job.id)
        .join(Resume, Interview.resume_id == Resume.id)
        .outerjoin(Evaluation, Interview.id == Evaluation.interview_id)
        .order_by(Interview.created_at.desc())
    )
    result = await db.execute(query)
    results = result.all()

    out_list = []
    for interview, job, resume, evaluation in results:
        eval_out = None
        if evaluation:
            eval_out = EvaluationOut(
                evaluation_id=evaluation.id,
                interview_id=evaluation.interview_id,
                candidate_name=resume.candidate_name,
                job_title=job.title,
                technical_score=evaluation.technical_score,
                communication_score=evaluation.communication_score,
                consistency_score=evaluation.consistency_score,
                depth_score=evaluation.depth_score,
                confidence_score=evaluation.confidence_score,
                overall_score=evaluation.overall_score,
                strengths=evaluation.strengths or [],
                red_flags=evaluation.red_flags or [],
                skill_gap_confirmed=evaluation.skill_gap_confirmed or {},
                hire_recommendation=evaluation.hire_recommendation,
                summary_report=evaluation.summary_report or "",
                created_at=evaluation.created_at,
            )

        out_list.append(
            InterviewOut(
                id=interview.id,
                resume_id=interview.resume_id,
                job_id=interview.job_id,
                job_title=job.title,
                company=job.company or "Unknown",
                candidate_name=resume.candidate_name,
                candidate_email=resume.candidate_email or "",
                status=interview.status,
                mode=interview.mode,
                created_at=interview.created_at,
                evaluation_score=evaluation.overall_score if evaluation else None,
                evaluation=eval_out,
            )
        )
    return out_list

@router.post("/reschedule-request", status_code=status.HTTP_200_OK)
async def reschedule_request(
    payload: RescheduleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sends a rescheduling request to the recruiter/HR."""
    # Fetch job and resume
    result = await db.execute(select(Job).where(Job.id == payload.job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = await db.execute(select(Resume).where(Resume.id == payload.resume_id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Fetch recruiter email
    result = await db.execute(select(User).where(User.id == job.owner_id))
    recruiter = result.scalars().first()
    recruiter_email = recruiter.email if recruiter else "hr@hireflow.ai"

    # Send email
    from app.services.notification_service import send_reschedule_request_email
    try:
        send_reschedule_request_email(
            recruiter_email=recruiter_email,
            candidate_name=resume.candidate_name,
            job_title=job.title,
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to send reschedule email: {e}")
        
    return {"message": "Reschedule request sent successfully."}
