from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User, Resume, Job
from app.schemas.all_schemas import ResumeUploadResponse, ResumeOut
from app.utils.file_handler import save_upload_file
from app.services.resume_service import (
    extract_text_from_file,
    parse_resume_sections,
    parse_resume_sections_with_gemini,
    extract_candidate_email,
    get_parsed_sections_summary,
)

router = APIRouter(tags=["Resumes"])


@router.post("/upload-resume", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    job_id: UUID = Form(...),
    candidate_name: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a candidate PDF or DOCX resume. Extract and parse its text immediately."""
    # Verify job exists
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    # Save file to disk
    file_path, file_name, file_size_kb = await save_upload_file(file)

# Extract text from PDF or DOCX
    try:
        extracted_text = extract_text_from_file(file_path, file_name)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Parse resume sections with Gemini extraction (fallback to regex)
    try:
        from app.config.settings import settings
        parsed_sections = await parse_resume_sections_with_gemini(extracted_text, settings.GEMINI_API_KEY)
    except Exception:
        parsed_sections = parse_resume_sections(extracted_text)
    
    candidate_email = extract_candidate_email(extracted_text)

    # Create resume record
    resume = Resume(
        job_id=job_id,
        uploaded_by=current_user.id,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        file_path=file_path,
        file_name=file_name,
        file_size_kb=file_size_kb,
        extracted_text=extracted_text,
        parsed_sections=parsed_sections,
    )
    db.add(resume)
    await db.flush()

    return ResumeUploadResponse(
        resume_id=resume.id,
        candidate_name=resume.candidate_name,
        candidate_email=candidate_email,
        job_id=job_id,
        file_name=file_name,
        file_size_kb=file_size_kb,
        extracted_text_preview=extracted_text[:300],
        parsed_sections=get_parsed_sections_summary(parsed_sections),
    )


@router.get("/resumes/{job_id}", response_model=List[ResumeOut])
async def list_resumes(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all resumes for a job, ordered by ranking_score DESC."""
    result = await db.execute(
        select(Resume)
        .where(Resume.job_id == job_id)
        .order_by(Resume.ranking_score.desc().nulls_last(), Resume.created_at.desc())
    )
    return result.scalars().all()


@router.get("/resume/{resume_id}", response_model=ResumeOut)
async def get_resume(
    resume_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single resume with all fields."""
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume
