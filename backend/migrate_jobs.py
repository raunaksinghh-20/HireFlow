import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

from app.config.settings import settings

async def upgrade_db():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN vacant_positions INTEGER DEFAULT 1;"))
            print("Added vacant_positions column.")
        except Exception as e:
            print(f"vacant_positions might already exist: {e}")
        
        try:
            await conn.execute(text("ALTER TABLE jobs ADD COLUMN application_deadline TIMESTAMP WITH TIME ZONE;"))
            print("Added application_deadline column.")
        except Exception as e:
            print(f"application_deadline might already exist: {e}")

if __name__ == "__main__":
    asyncio.run(upgrade_db())
