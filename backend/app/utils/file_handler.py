import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config.settings import settings


def get_upload_dir() -> Path:
    """Get and ensure the upload directory exists."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


async def save_upload_file(file: UploadFile) -> tuple[str, str, int]:
    """
    Save an uploaded file to disk.
    Returns (file_path, file_name, file_size_kb).
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
    file_path = upload_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(content)

    return str(file_path), file.filename, file_size_kb


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
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        pass
