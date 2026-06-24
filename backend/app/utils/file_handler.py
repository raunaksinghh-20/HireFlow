import os
import uuid
import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config.settings import settings

logger = logging.getLogger(__name__)


def get_supabase_client():
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            from supabase import create_client, Client
            return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        except ImportError:
            logger.warning("Supabase SDK not installed. Run: pip install supabase")
            return None
    return None


def get_upload_dir() -> Path:
    """Get and ensure the upload directory exists."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


async def save_upload_file(file: UploadFile) -> tuple[str, str | None, str, int]:
    """
    Save an uploaded file to disk and optionally to Supabase Storage.
    Returns (local_file_path, public_url, file_name, file_size_kb).
    public_url will be None if Supabase is not configured.
    """
    validate_pdf(file)
    content = await file.read()
    file_size_kb = len(content) // 1024

    max_bytes = settings.MAX_RESUME_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_RESUME_SIZE_MB}MB",
        )

    upload_dir = get_upload_dir()
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    local_file_path = upload_dir / unique_name

    with open(local_file_path, "wb") as f:
        f.write(content)

    public_url = None
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.storage.from_(settings.SUPABASE_BUCKET_RESUMES).upload(
                path=unique_name,
                file=content,
                file_options={"content-type": file.content_type}
            )
            public_url = supabase.storage.from_(settings.SUPABASE_BUCKET_RESUMES).get_public_url(unique_name)
        except Exception as e:
            logger.error(f"Supabase resume upload failed: {e}")

    return str(local_file_path), public_url, file.filename, file_size_kb


def validate_pdf(file: UploadFile) -> None:
    """Validate that the uploaded file is a PDF."""
    if file.content_type not in ("application/pdf",):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF files are supported",
        )


def delete_file(file_path: str) -> None:
    """Delete a file from disk if it exists."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass


def get_avatar_dir() -> Path:
    """Get and ensure the avatar upload directory exists."""
    avatar_dir = Path(settings.AVATAR_DIR)
    avatar_dir.mkdir(parents=True, exist_ok=True)
    return avatar_dir


async def save_avatar_file(file: UploadFile) -> str:
    """
    Save an uploaded avatar file to disk and optionally to Supabase Storage.
    Returns the Supabase public URL or the local static path.
    """
    if file.content_type not in ("image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PNG, JPEG, WEBP, and GIF images are supported",
        )

    content = await file.read()
    max_bytes = 5 * 1024 * 1024  # 5MB max
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile picture exceeds maximum size of 5MB",
        )

    avatar_dir = get_avatar_dir()
    unique_name = f"{uuid.uuid4()}_{file.filename}"
    local_file_path = avatar_dir / unique_name

    with open(local_file_path, "wb") as f:
        f.write(content)

    public_url = None
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.storage.from_(settings.SUPABASE_BUCKET_AVATARS).upload(
                path=unique_name,
                file=content,
                file_options={"content-type": file.content_type}
            )
            public_url = supabase.storage.from_(settings.SUPABASE_BUCKET_AVATARS).get_public_url(unique_name)
        except Exception as e:
            logger.error(f"Supabase avatar upload failed: {e}")

    return public_url if public_url else f"/uploads/avatars/{unique_name}"
