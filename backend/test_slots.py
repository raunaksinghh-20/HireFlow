import asyncio

from app.models.db_models import User
from app.api.calendar_routes import my_slots
from app.config.database import AsyncSessionLocal
from fastapi import Depends

async def run():
    async with AsyncSessionLocal() as session:
        user = User(email="candidate1@gmail.com")
        try:
            res = await my_slots(current_user=user, db=session)
            from pydantic import TypeAdapter
            from typing import List
            from app.schemas.all_schemas import ScheduledInterviewOut
            adapter = TypeAdapter(List[ScheduledInterviewOut])
            serialized = adapter.validate_python(res)
            print("Serialized successfully!")
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(run())
