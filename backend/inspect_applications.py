import asyncio
from app.config.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.db_models import Application, User

async def test():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Application))
        apps = result.scalars().all()
        for a in apps:
            user_res = await db.execute(select(User).where(User.id == a.candidate_id))
            u = user_res.scalars().first()
            print(f"App ID: {a.id}, Candidate: {u.full_name if u else 'None'}, Job ID: {a.job_id}, Resume ID: {a.resume_id}, ATS Score: {a.ats_score}")

asyncio.run(test())
