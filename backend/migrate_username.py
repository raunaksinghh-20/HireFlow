import asyncio
import os
import uuid
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        try:
            # 1. Add username to users
            await conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR;"))
            # Temporary backfill: set username to email prefix or email to ensure uniqueness
            await conn.execute(text("UPDATE users SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 4);"))
            await conn.execute(text("ALTER TABLE users ALTER COLUMN username SET NOT NULL;"))
            await conn.execute(text("ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);"))
            await conn.execute(text("CREATE INDEX ix_users_username ON users (username);"))
            
            # Make email nullable in users
            await conn.execute(text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL;"))
            
            print("Successfully migrated users table.")
        except Exception as e:
            print(f"Error migrating users (might already exist): {e}")

        try:
            # 2. Add candidate_username to scheduled_interviews
            await conn.execute(text("ALTER TABLE scheduled_interviews ADD COLUMN candidate_username VARCHAR;"))
            # Backfill
            await conn.execute(text("UPDATE scheduled_interviews SET candidate_username = split_part(candidate_email, '@', 1) || '_1234';"))
            await conn.execute(text("ALTER TABLE scheduled_interviews ALTER COLUMN candidate_username SET NOT NULL;"))
            print("Successfully migrated scheduled_interviews table.")
        except Exception as e:
            print(f"Error migrating scheduled_interviews (might already exist): {e}")

        try:
            # 3. Add candidate_username to resumes
            await conn.execute(text("ALTER TABLE resumes ADD COLUMN candidate_username VARCHAR;"))
            print("Successfully migrated resumes table.")
        except Exception as e:
            print(f"Error migrating resumes (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(main())
