from uuid import UUID
from typing import List
from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User, ScheduledInterview, Job, Resume
from app.schemas.all_schemas import ScheduledInterviewCreate, ScheduledInterviewOut
from app.services.notification_service import send_interview_invitation_email

router = APIRouter(tags=["Calendar Integration"])
logger = logging.getLogger(__name__)


@router.post("/calendar/schedule", response_model=ScheduledInterviewOut, status_code=status.HTTP_201_CREATED)
async def schedule_interview(
    payload: ScheduledInterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Schedule a new candidate interview slot and notify the candidate via email."""
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == payload.job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Look up resume for this candidate to build the interview link
    resume_result = await db.execute(
        select(Resume)
        .where(Resume.job_id == payload.job_id)
        .where(
            (Resume.candidate_username == payload.candidate_username) |
            (Resume.candidate_name == payload.candidate_name)
        )
    )
    resume = resume_result.scalars().first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No uploaded resume found matching this candidate username or name. Please upload a resume first."
        )

    # Create scheduled slot
    slot = ScheduledInterview(
        job_id=payload.job_id,
        candidate_name=payload.candidate_name,
        candidate_username=payload.candidate_username,
        scheduled_time=payload.scheduled_time,
        status="pending",
    )
    db.add(slot)
    
    # Also update the application status to interview_scheduled
    from app.models.db_models import Application
    application_result = await db.execute(
        select(Application).where(
            (Application.job_id == payload.job_id) &
            (Application.resume_id == resume.id)
        )
    )
    application = application_result.scalars().first()
    if application:
        application.status = "interview_scheduled"

    await db.flush()

    # Trigger email invitation to candidate (assuming username can be used to lookup email or is email)
    try:
        # TODO: Lookup user email from username if we want to send an actual email, 
        # or skip if email is no longer collected
        send_interview_invitation_email(
            candidate_email=payload.candidate_username, # Mocking sending to username for now
            candidate_name=payload.candidate_name,
            job_title=job.title,
            resume_id=str(resume.id),
            job_id=str(job.id)
        )
    except Exception as e:
        logger.error(f"Failed to send email invitation: {e}")

    return slot


@router.get("/calendar/slots/{job_id}", response_model=List[ScheduledInterviewOut])
async def list_slots(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all scheduled interview slots for a job, sorted by scheduled time."""
    result = await db.execute(
        select(ScheduledInterview)
        .where(ScheduledInterview.job_id == job_id)
        .order_by(ScheduledInterview.scheduled_time.asc())
    )
    return result.scalars().all()


@router.get("/calendar/my-slots", response_model=List[ScheduledInterviewOut])
async def my_slots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all scheduled interview slots for the current candidate."""
    result = await db.execute(
        select(ScheduledInterview, Job, Resume)
        .join(Job, ScheduledInterview.job_id == Job.id)
        .outerjoin(Resume, (Resume.job_id == Job.id) & (
            (Resume.candidate_username == ScheduledInterview.candidate_username) | 
            (Resume.candidate_name == ScheduledInterview.candidate_name)
        ))
        .where(ScheduledInterview.candidate_username == current_user.username)
        .order_by(ScheduledInterview.scheduled_time.asc())
    )
    
    out = []
    for slot, job, resume in result:
        out.append(ScheduledInterviewOut(
            id=slot.id,
            job_id=slot.job_id,
            candidate_name=slot.candidate_name,
            candidate_username=slot.candidate_username,
            scheduled_time=slot.scheduled_time,
            status=slot.status,
            created_at=slot.created_at,
            job_title=job.title,
            company=job.company,
            resume_id=resume.id if resume else None,
        ))
    return out

@router.delete("/calendar/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slot(
    slot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel and delete a scheduled interview slot."""
    result = await db.execute(
        select(ScheduledInterview).where(ScheduledInterview.id == slot_id)
    )
    slot = result.scalars().first()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scheduled slot not found")

    await db.delete(slot)
    await db.flush()
    return None
