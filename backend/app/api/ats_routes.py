from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
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
    background_tasks: BackgroundTasks,
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
    
    # Also update Application cached ats_score and resume_id if application exists
    from app.models.db_models import Application
    app_result = await db.execute(
        select(Application).where(
            (Application.candidate_id == resume.uploaded_by) & 
            (Application.job_id == job.id)
        )
    )
    application = app_result.scalars().first()
    if application:
        application.ats_score = scoring["ats_score"]
        application.resume_id = resume.id

    await db.flush()

    # Trigger email notification in background
    from app.services.notification_service import send_screening_completed_email
    if resume.candidate_email:
        background_tasks.add_task(
            send_screening_completed_email,
            candidate_email=resume.candidate_email,
            candidate_name=resume.candidate_name,
            job_title=job.title,
            ats_score=scoring["ats_score"]
        )

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
    """Return all candidates who applied for a job ranked by ranking_score."""
    from app.models.db_models import Application, Resume, User as DBUser
    
    # Query Applications joined with Resume and User
    result = await db.execute(
        select(Application, Resume, DBUser)
        .join(DBUser, Application.candidate_id == DBUser.id)
        .outerjoin(Resume, (Resume.job_id == Application.job_id) & (Resume.uploaded_by == Application.candidate_id))
        .where(Application.job_id == job_id)
        .order_by(Resume.ranking_score.desc().nulls_last())
    )
    raw_applications = result.all()

    # Deduplicate by candidate ID to keep only the highest scoring resume/application combo
    seen_candidates = set()
    applications = []
    for app, r, u in raw_applications:
        if u.id not in seen_candidates:
            seen_candidates.add(u.id)
            applications.append((app, r, u))

    return [
        RankedCandidateOut(
            rank=idx + 1,
            resume_id=r.id if r else None,
            candidate_id=u.id,
            candidate_name=u.full_name,
            candidate_email=u.email,
            ats_score=app.ats_score,
            ranking_score=r.ranking_score if r else 0,
            matched_skills=r.matched_skills if r else [],
            skill_gaps=r.skill_gaps if r else [],
        )
        for idx, (app, r, u) in enumerate(applications)
    ]
