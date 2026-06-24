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
            # Add vacant_positions to jobs
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN vacant_positions INTEGER DEFAULT 1;"))
            print("Successfully added vacant_positions column.")
        except Exception as e:
            print(f"Error adding vacant_positions (might already exist): {e}")

        try:
            # Add deadline to jobs
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN deadline TIMESTAMP WITH TIME ZONE;"))
            print("Successfully added deadline column.")
        except Exception as e:
            print(f"Error adding deadline (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(main())
