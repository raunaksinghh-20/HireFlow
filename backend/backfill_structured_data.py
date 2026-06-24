import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

from app.models.db_models import Resume, Job
from app.services.resume_parser import parse_resume_to_structured, parse_jd_to_structured

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as db:
        # 1. Backfill Jobs
        result_jobs = await db.execute(select(Job).where(Job.structured_jd == None))
        jobs = result_jobs.scalars().all()
        print(f"Found {len(jobs)} jobs to backfill.")
        for job in jobs:
            print(f"Backfilling job: {job.title}")
            try:
                job.structured_jd = await parse_jd_to_structured(job.description, job.title)
                await db.flush()
            except Exception as e:
                print(f"Error backfilling job {job.id}: {e}")

        # 2. Backfill Resumes
        result_resumes = await db.execute(select(Resume).where(Resume.structured_resume == None))
        resumes = result_resumes.scalars().all()
        print(f"Found {len(resumes)} resumes to backfill.")
        for resume in resumes:
            print(f"Backfilling resume: {resume.candidate_name}")
            try:
                resume.structured_resume = await parse_resume_to_structured(
                    resume.extracted_text or "", resume.candidate_name
                )
                await db.flush()
            except Exception as e:
                print(f"Error backfilling resume {resume.id}: {e}")

        await db.commit()
    print("Backfill completed successfully.")

if __name__ == "__main__":
    asyncio.run(main())
