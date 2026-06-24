from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.db_models import User
from app.core.security import hash_password, verify_password


async def register_user(db: AsyncSession, username: str, password: str, full_name: str, email: str = None, role: str = "candidate") -> User:
    """Create a new user. Raises 409 if username already exists."""
    result = await db.execute(select(User).where(User.username == username))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered",
        )

    if email:
        result_email = await db.execute(select(User).where(User.email == email))
        existing_email = result_email.scalars().first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
    """Verify credentials. Raises 401 for bad creds, 403 for deactivated accounts."""
    result = await db.execute(select(User).where((User.username == username) | (User.email == username)))
    user = result.scalars().first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    return user
