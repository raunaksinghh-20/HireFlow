from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.core.security import create_access_token
from app.schemas.all_schemas import LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user

router = APIRouter(tags=["Authentication"])


@router.post("/login-json", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login_json(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Alternative login endpoint that accepts a JSON body (email + password)
    instead of OAuth2 form-encoded data. Reuses the same authenticate_user
    service as /login, so behavior stays identical — just a different
    request shape for clients (e.g. frontend fetch/axios calls) that
    prefer JSON over application/x-www-form-urlencoded.
    """
    user = await authenticate_user(db, payload.email, payload.password)
    token, expires_in = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )