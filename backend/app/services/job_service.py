from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.db_models import Job


async def create_job(db: AsyncSession, owner_id: UUID, title: str, company: str | None,
                     description: str, required_skills: list, experience_years: int,
                     vacant_positions: int = 1, application_deadline: datetime | None = None) -> Job:
    """Create a new job posting."""
    try:
        from app.services.resume_parser import parse_jd_to_structured
        structured_jd = await parse_jd_to_structured(description, title)
    except Exception:
        structured_jd = None

    job = Job(
        owner_id=owner_id,
        title=title,
        company=company,
        description=description,
        required_skills=required_skills or [],
        experience_years=experience_years,
        vacant_positions=vacant_positions,
        application_deadline=application_deadline,
        structured_jd=structured_jd,
    )
    db.add(job)
    await db.flush()
    return job


async def get_jobs(db: AsyncSession, owner_id: UUID) -> list[Job]:
    """List all active jobs for a user, newest first."""
    result = await db.execute(
        select(Job)
        .where(Job.owner_id == owner_id, Job.is_active == True)
        .order_by(Job.created_at.desc())
    )
    return result.scalars().all()


async def get_job(db: AsyncSession, job_id: UUID, owner_id: UUID) -> Job:
    """Get a single job. Raises 404 if not found or not owned by user."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.owner_id == owner_id)
    )
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


async def get_job_by_id(db: AsyncSession, job_id: UUID) -> Job:
    """Get a single job by ID only (no owner check)."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


async def update_job(db: AsyncSession, job_id: UUID, owner_id: UUID, **kwargs) -> Job:
    """Update a job's fields."""
    job = await get_job(db, job_id, owner_id)
    for key, value in kwargs.items():
        if value is not None:
            setattr(job, key, value)
    
    # If description was updated, regenerate structured_jd
    if "description" in kwargs and kwargs["description"] is not None:
        try:
            from app.services.resume_parser import parse_jd_to_structured
            job.structured_jd = await parse_jd_to_structured(job.description, job.title)
        except Exception:
            pass

    await db.flush()
    return job


async def delete_job(db: AsyncSession, job_id: UUID, owner_id: UUID) -> None:
    """Soft delete a job (set is_active=False)."""
    job = await get_job(db, job_id, owner_id)
    job.is_active = False
    await db.flush()
