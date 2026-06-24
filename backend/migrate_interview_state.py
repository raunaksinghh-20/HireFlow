import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # 1. Add structured_jd to jobs table
        try:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN structured_jd JSONB;"))
            print("Successfully added structured_jd column to jobs table.")
        except Exception as e:
            print(f"Error adding structured_jd (might already exist): {e}")

        # 2. Add structured_resume to resumes table
        try:
            await conn.execute(text("ALTER TABLE resumes ADD COLUMN structured_resume JSONB;"))
            print("Successfully added structured_resume column to resumes table.")
        except Exception as e:
            print(f"Error adding structured_resume (might already exist): {e}")

        # 3. Create interview_state table
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS interview_state (
                    interview_id UUID PRIMARY KEY,
                    current_topic TEXT,
                    topic_coverage JSONB NOT NULL DEFAULT '{}'::jsonb,
                    candidate_claims JSONB NOT NULL DEFAULT '[]'::jsonb,
                    rolling_summary TEXT NOT NULL DEFAULT '',
                    recent_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
                    candidate_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
                    turn_count INT NOT NULL DEFAULT 0,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT fk_interview FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
                );
            """))
            print("Successfully created interview_state table.")
        except Exception as e:
            print(f"Error creating interview_state table: {e}")

if __name__ == "__main__":
    asyncio.run(main())
