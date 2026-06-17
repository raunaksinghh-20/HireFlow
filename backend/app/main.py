import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.config.database import engine, Base

# Import all models so they are registered with Base.metadata
from app.models.db_models import User, Job, Resume, Interview, Transcript, Evaluation  # noqa: F401

# Import routers
from app.api.auth_routes import router as auth_router
from app.api.job_routes import router as job_router
from app.api.resume_routes import router as resume_router
from app.api.ats_routes import router as ats_router
from app.api.interview_routes import router as interview_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables. Shutdown: dispose engine."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified")
    yield
    await engine.dispose()
    logger.info("Database engine disposed")


app = FastAPI(
    title="HireFlow AI",
    description="AI-Powered Recruitment Platform — Resume Screening & Adaptive Interview Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ─────────────────────────────────────────
app.include_router(auth_router, prefix="/api/v1")
app.include_router(job_router, prefix="/api/v1")
app.include_router(resume_router, prefix="/api/v1")
app.include_router(ats_router, prefix="/api/v1")
app.include_router(interview_router, prefix="/api/v1")


# ── Health Check ──────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/docs",
        "app": "HireFlow AI",
    }


# ── Global Exception Handler ─────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
