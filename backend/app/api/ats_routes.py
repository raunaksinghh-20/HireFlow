from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User, Resume, Job
from app.schemas.all_schemas import ATSScoreRequest, ATSScoreResponse, ATSBreakdown, RankedCandidateOut
from app.services.ats_service import calculate_ats_score

router = APIRouter(tags=["ATS Scoring"])


@router.post("/ats-score", response_model=ATSScoreResponse)
async def score_resume(
    payload: ATSScoreRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Score a resume against its job description."""
    # Fetch resume
    result = await db.execute(select(Resume).where(Resume.id == payload.resume_id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")

    if not resume.extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text not extracted. Re-upload the resume.",
        )

    # Fetch job
    result = await db.execute(select(Job).where(Job.id == resume.job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Calculate ATS score
    scoring = calculate_ats_score(resume, job)

    # Update resume record
    resume.ats_score = scoring["ats_score"]
    resume.skill_gaps = scoring["skill_gaps"]
    resume.matched_skills = scoring["matched_skills"]
    resume.ranking_score = scoring["ranking_score"]
    await db.flush()

    # Trigger email notification
    from app.services.notification_service import send_screening_completed_email
    if resume.candidate_email:
        try:
            send_screening_completed_email(
                candidate_email=resume.candidate_email,
                candidate_name=resume.candidate_name,
                job_title=job.title,
                ats_score=scoring["ats_score"]
            )
        except Exception as e:
            # Prevent email failure from breaking API response
            import logging
            logging.getLogger(__name__).error(f"Failed to send email: {e}")

    return ATSScoreResponse(
        resume_id=resume.id,
        candidate_name=resume.candidate_name,
        ats_score=scoring["ats_score"],
        matched_skills=scoring["matched_skills"],
        skill_gaps=scoring["skill_gaps"],
        match_percentage=scoring["match_percentage"],
        experience_match=scoring["experience_match"],
        ranking_score=scoring["ranking_score"],
        recommendation=scoring["recommendation"],
        breakdown=ATSBreakdown(**scoring["breakdown"]),
    )


@router.get("/rank-candidates/{job_id}", response_model=List[RankedCandidateOut])
async def rank_candidates(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all scored candidates for a job ranked by ranking_score."""
    result = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id)
        .order_by(Resume.ranking_score.desc().nulls_last())
    )
    resumes = result.scalars().all()

    return [
        RankedCandidateOut(
            rank=idx + 1,
            resume_id=r.id,
            candidate_name=r.candidate_name,
            candidate_email=r.candidate_email,
            ats_score=r.ats_score,
            ranking_score=r.ranking_score or 0,
            matched_skills=r.matched_skills or [],
            skill_gaps=r.skill_gaps or [],
        )
        for idx, r in enumerate(resumes)
    ]
