import asyncio
from uuid import UUID
from app.config.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.db_models import Application, Resume, User as DBUser

async def test():
    async with AsyncSessionLocal() as db:
        job_id = UUID("cb36f398-07f3-424a-8654-9f1fed02069a")
        result = await db.execute(
            select(Application, Resume, DBUser)
            .join(DBUser, Application.candidate_id == DBUser.id)
            .outerjoin(Resume, (Resume.job_id == Application.job_id) & (Resume.uploaded_by == Application.candidate_id))
            .where(Application.job_id == job_id)
            .order_by(Resume.ranking_score.desc().nulls_last())
        )
        applications = result.all()
        print(f"Total applications query rows: {len(applications)}")
        for idx, (app, r, u) in enumerate(applications):
            print(f"Row {idx+1}: App ID: {app.id}, Candidate: {u.full_name}, Resume ID: {r.id if r else None}, ATS: {r.ats_score if r else None}")

asyncio.run(test())
