import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.config.database import AsyncSessionLocal
from app.services.auth_service import register_user

async def main():
    async with AsyncSessionLocal() as session:
        try:
            await register_user(session, "test2@example.com", "password", "Test User")
            await session.commit()
            print("Success")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
