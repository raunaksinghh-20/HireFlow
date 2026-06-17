from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User
from app.schemas.all_schemas import JobCreate, JobUpdate, JobOut
from app.services.job_service import (
    create_job, get_jobs, get_job, update_job, delete_job,
)

router = APIRouter(tags=["Jobs"])


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job_endpoint(
    payload: JobCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a job posting with full JD text."""
    job = await create_job(
        db,
        owner_id=current_user.id,
        title=payload.title,
        company=payload.company,
        description=payload.description,
        required_skills=payload.required_skills,
        experience_years=payload.experience_years,
    )
    return job


@router.get("/jobs", response_model=List[JobOut])
async def list_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all active jobs for current user."""
    return await get_jobs(db, current_user.id)


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job_endpoint(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single job."""
    return await get_job(db, job_id, current_user.id)


@router.put("/jobs/{job_id}", response_model=JobOut)
async def update_job_endpoint(
    job_id: UUID,
    payload: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update job title, description, skills, or experience."""
    return await update_job(
        db, job_id, current_user.id,
        title=payload.title,
        company=payload.company,
        description=payload.description,
        required_skills=payload.required_skills,
        experience_years=payload.experience_years,
    )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job_endpoint(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — set is_active = False."""
    await delete_job(db, job_id, current_user.id)
