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
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN profile_picture VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN bio VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN linkedin_url VARCHAR;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN experience_years INTEGER DEFAULT 0;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN skills JSON;"))
            print("Successfully added profile fields to users table.")
        except Exception as e:
            print(f"Error (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(main())
