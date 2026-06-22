from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import create_access_token
from app.schemas.all_schemas import UserCreate, TokenResponse, UserOut
from app.services.auth_service import register_user, authenticate_user
from app.api.dependencies import get_current_user
from app.models.db_models import User

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new account. Returns a JWT immediately."""
    user = await register_user(db, payload.email, payload.password, payload.full_name, payload.role)
    token, expires_in = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        profile_picture=user.profile_picture,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Authenticate with email/password, receive JWT."""
    user = await authenticate_user(db, payload.username, payload.password)
    token, expires_in = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        profile_picture=user.profile_picture,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Fetch authenticated user's profile."""
    return current_user
