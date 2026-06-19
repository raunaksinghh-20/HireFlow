from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.api.dependencies import get_current_user
from app.models.db_models import User
from app.schemas.all_schemas import UserProfileOut, UserProfileUpdate
from app.utils.file_handler import save_avatar_file

router = APIRouter(prefix="/profile", tags=["Profiles"])


@router.get("", response_model=UserProfileOut)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Fetch current user's profile information."""
    return current_user


@router.put("", response_model=UserProfileOut)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile information."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.bio is not None:
        current_user.bio = payload.bio
    if payload.linkedin_url is not None:
        current_user.linkedin_url = payload.linkedin_url
    if payload.experience_years is not None:
        current_user.experience_years = payload.experience_years
    if payload.skills is not None:
        current_user.skills = payload.skills

    await db.flush()
    return current_user


@router.post("/picture", response_model=UserProfileOut)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a profile picture and associate it with the current user."""
    file_path = await save_avatar_file(file)
    current_user.profile_picture = file_path
    await db.flush()
    return current_user
