from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.api.dependencies import get_current_user, require_role
from app.models.db_models import User, Job, Resume, Application
from app.schemas.all_schemas import ApplicationCreate, ApplicationOut, ApplicationUpdateStatus

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_to_job(
    payload: ApplicationCreate,
    current_user: User = Depends(require_role(["candidate"])),
    db: AsyncSession = Depends(get_db),
):
    """Allows candidates to apply for a job with a resume."""
    # Verify job exists
    job_result = await db.execute(select(Job).where(Job.id == payload.job_id))
    job = job_result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Verify if already applied
    app_result = await db.execute(
        select(Application).where(
            (Application.candidate_id == current_user.id) &
            (Application.job_id == payload.job_id)
        )
    )
    existing_app = app_result.scalars().first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied for this job",
        )

    # Verify resume exists and belongs to the candidate
    ats_score = None
    if payload.resume_id:
        resume_result = await db.execute(
            select(Resume).where(
                (Resume.id == payload.resume_id) &
                (Resume.uploaded_by == current_user.id)
            )
        )
        resume = resume_result.scalars().first()
        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found or does not belong to you",
            )
        ats_score = resume.ats_score

    application = Application(
        candidate_id=current_user.id,
        job_id=payload.job_id,
        resume_id=payload.resume_id,
        status="applied",
        ats_score=ats_score,
    )
    db.add(application)
    await db.flush()

    # Build response
    return ApplicationOut(
        id=application.id,
        candidate_id=application.candidate_id,
        job_id=application.job_id,
        resume_id=application.resume_id,
        status=application.status,
        ats_score=application.ats_score,
        rejection_reason=application.rejection_reason,
        created_at=application.created_at,
        updated_at=application.updated_at,
        job_title=job.title,
        company=job.company,
        candidate_name=current_user.full_name,
        candidate_email=current_user.email,
    )


@router.get("", response_model=List[ApplicationOut])
async def list_applications(
    job_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List applications.
    - Candidates see only their own applications.
    - Recruiters/HR see applications for all jobs (or filtered by job_id).
    """
    query = (
        select(Application, Job, User, Resume)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.candidate_id == User.id)
        .outerjoin(Resume, Resume.id == Application.resume_id)
    )

    if current_user.role == "candidate":
        query = query.where(Application.candidate_id == current_user.id)
    else:
        # Recruiters/HR can view all or filter by job
        if job_id:
            query = query.where(Application.job_id == job_id)

    result = await db.execute(query)
    results = result.all()

    out_list = []
    for app, job, candidate, resume in results:
        resume_id = resume.id if resume else app.resume_id
        ats_score = resume.ats_score if resume else app.ats_score
        app_ats = ats_score if current_user.role in ("recruiter", "hr") else None

        out_list.append(
            ApplicationOut(
                id=app.id,
                candidate_id=app.candidate_id,
                job_id=app.job_id,
                resume_id=resume_id,
                status=app.status,
                ats_score=app_ats,
                rejection_reason=app.rejection_reason,
                created_at=app.created_at,
                updated_at=app.updated_at,
                job_title=job.title,
                company=job.company,
                candidate_name=candidate.full_name,
                candidate_email=candidate.email,
            )
        )
    return out_list


@router.put("/{application_id}/status", response_model=ApplicationOut)
async def update_application_status(
    application_id: UUID,
    payload: ApplicationUpdateStatus,
    current_user: User = Depends(require_role(["recruiter", "hr"])),
    db: AsyncSession = Depends(get_db),
):
    """Allows Recruiter/HR to approve or reject a candidate application."""
    query = select(Application, Job, User).join(Job, Application.job_id == Job.id).join(User, Application.candidate_id == User.id).where(Application.id == application_id)
    result = await db.execute(query)
    found = result.first()
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    app, job, candidate = found
    app.status = payload.status
    if payload.status == "rejected":
        app.rejection_reason = payload.rejection_reason
    else:
        app.rejection_reason = None

    await db.flush()
    await db.refresh(app)

    # Find resume to return its ID if it exists
    res_result = await db.execute(
        select(Resume).where((Resume.job_id == app.job_id) & (Resume.uploaded_by == app.candidate_id))
    )
    resume = res_result.scalars().first()
    resume_id = resume.id if resume else app.resume_id

    return ApplicationOut(
        id=app.id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        resume_id=resume_id,
        status=app.status,
        ats_score=app.ats_score,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at,
        updated_at=app.updated_at,
        job_title=job.title,
        company=job.company,
        candidate_name=candidate.full_name,
        candidate_email=candidate.email,
    )


@router.put("/by-resume/{resume_id}/status", response_model=ApplicationOut)
async def update_application_status_by_resume(
    resume_id: UUID,
    payload: ApplicationUpdateStatus,
    current_user: User = Depends(require_role(["recruiter", "hr"])),
    db: AsyncSession = Depends(get_db),
):
    """Allows Recruiter/HR to approve or reject a candidate application using resume_id."""
    query = (
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.candidate_id == User.id)
        .join(Resume, Resume.id == Application.resume_id)
        .where(Resume.id == resume_id)
    )
    result = await db.execute(query)
    found = result.first()
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    app, job, candidate = found
    app.status = payload.status
    app.resume_id = resume_id
    if payload.status == "rejected":
        app.rejection_reason = payload.rejection_reason
    else:
        app.rejection_reason = None

    await db.flush()
    await db.refresh(app)

    return ApplicationOut(
        id=app.id,
        candidate_id=app.candidate_id,
        job_id=app.job_id,
        resume_id=resume_id,
        status=app.status,
        ats_score=app.ats_score,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at,
        updated_at=app.updated_at,
        job_title=job.title,
        company=job.company,
        candidate_name=candidate.full_name,
        candidate_email=candidate.email,
    )
