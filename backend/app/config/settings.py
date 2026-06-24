from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://hireflow_user:hireflow_password@localhost:5432/hireflow_db"

    # ── Redis ─────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ──────────────────────────────────────────────────────
    SECRET_KEY: str = "supersecretkey_please_change_in_production_min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── AI APIs ──────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    CEREBRAS_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""

    # ── Email Settings ───────────────────────────────────────────
    SENDGRID_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@hireflow.ai"

    # ── File Storage ──────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads/resumes"
    AVATAR_DIR: str = "uploads/avatars"
    MAX_RESUME_SIZE_MB: int = 10

    # ── App ──────────────────────────────────────────────────────
    APP_ENV: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    USE_STRUCTURED_CONTEXT: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
