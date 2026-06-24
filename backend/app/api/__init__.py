# API package — all registered routers
from app.api.auth_routes import router as auth_router
from app.api.auth_json_routes import router as auth_json_router
from app.api.job_routes import router as job_router
from app.api.resume_routes import router as resume_router
from app.api.ats_routes import router as ats_router
from app.api.interview_routes import router as interview_router
from app.api.analytics_routes import router as analytics_router
from app.api.profile_routes import router as profile_router
from app.api.calendar_routes import router as calendar_router
from app.api.application_routes import router as application_router
