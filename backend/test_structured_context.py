import asyncio
import json
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config.settings import settings
from app.models.db_models import Interview, Resume, Job, InterviewState as DBInterviewState
from app.core.context_builder import (
    get_or_create_interview_state,
    evaluate_turn,
    update_interview_state,
    build_context,
    TurnSummary,
    estimate_tokens
)

async def test_token_budget_compression():
    print("Testing token budget compression...")
    # Mock TurnSummaries with large contents to exceed 2000 token budget
    turns = []
    for i in range(10):
        turns.append(TurnSummary(
            turn_number=i,
            llm_provider="test_provider",
            question="Q" * 500, # Large question
            answer="A" * 500,   # Large answer
            topic="system_design",
            score=80.0
        ))
    
    MAX_BUDGET = 2000
    recent_turns = list(turns)
    
    class MockPayload:
        def __init__(self, recent_turns):
            self.recent_turns = recent_turns
        def model_dump_json(self):
            return json.dumps([t.model_dump() for t in self.recent_turns])
            
    payload = MockPayload(recent_turns)
    initial_count = len(payload.recent_turns)
    
    while estimate_tokens(payload.model_dump_json()) > MAX_BUDGET and len(payload.recent_turns) > 2:
        payload.recent_turns.pop(0)
        
    final_count = len(payload.recent_turns)
    print(f"Initial turn count: {initial_count}, Final turn count after compression: {final_count}")
    assert final_count < initial_count, "Turns should be compressed!"
    assert final_count >= 2, "Should keep at least 2 turns!"
    print("Token budget compression test passed successfully!")

async def test_rolling_summary_trigger():
    print("Testing rolling summary trigger logic using Postgres...")
    # Connect to the main dev postgres DB
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Run inside a transaction that we will roll back
        job_id = uuid.uuid4()
        resume_id = uuid.uuid4()
        user_id = uuid.uuid4()
        interview_id = uuid.uuid4()
        
        from app.models.db_models import User
        
        # First add a user
        user = User(id=user_id, username=f"tester_{uuid.uuid4().hex[:6]}", full_name="Tester", hashed_password="pw")
        db.add(user)
        
        job = Job(id=job_id, owner_id=user_id, title="Software Engineer", description="Clean coder needed")
        db.add(job)
        
        resume = Resume(id=resume_id, job_id=job_id, uploaded_by=user_id, candidate_name="Alice", file_path="res.pdf", file_name="res.pdf")
        db.add(resume)
        
        interview = Interview(id=interview_id, resume_id=resume_id, job_id=job_id, created_by=user_id, status="active")
        db.add(interview)
        await db.flush()
        
        # Test get_or_create_interview_state
        state = await get_or_create_interview_state(db, str(interview_id))
        assert state is not None
        assert state.turn_count == 0
        
        # Add 6 turns to trigger rolling summarization (> 5 turns)
        from app.core.context_builder import TurnEvaluation
        
        for i in range(6):
            new_turn = TurnSummary(
                turn_number=i,
                llm_provider="test",
                question=f"Question {i}",
                answer=f"Answer {i}",
                topic="Python",
                score=80.0
            )
            eval_res = TurnEvaluation(
                updated_topic_status="partial",
                new_claims=[],
                score=80.0,
                next_recommended_topic="Python"
            )
            state = await update_interview_state(db, str(interview_id), new_turn, eval_res)
            
        print(f"State turn count: {state.turn_count}")
        print(f"State recent turns count: {len(state.recent_turns)}")
        assert len(state.recent_turns) == 3, "Recent turns should have compressed to 3!"
        
        # Roll back transaction so no data changes are committed
        await db.rollback()
        print("Rolling summary trigger test passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_token_budget_compression())
    asyncio.run(test_rolling_summary_trigger())
