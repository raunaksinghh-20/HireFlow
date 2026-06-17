"""
Redis Session Manager for Interview State
TTL: 1 hour per session
"""
import json
import uuid
from typing import Optional

import redis.asyncio as redis

from app.config.settings import settings

# Lazy-initialized Redis client
_redis_client: Optional[redis.Redis] = None

SESSION_PREFIX = "interview:"
SESSION_TTL = 3600  # 1 hour


async def _get_redis() -> redis.Redis:
    """Get or create the Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def create_session(state: dict) -> str:
    """
    Store interview state in Redis.
    Returns the session_token key.
    """
    r = await _get_redis()
    token = f"{SESSION_PREFIX}{uuid.uuid4().hex}"
    await r.setex(token, SESSION_TTL, json.dumps(state, default=str))
    return token


async def get_session(session_token: str) -> Optional[dict]:
    """
    Retrieve interview state from Redis.
    Returns None if session has expired or doesn't exist.
    """
    r = await _get_redis()
    data = await r.get(session_token)
    if data is None:
        return None
    return json.loads(data)


async def update_session(session_token: str, state: dict) -> None:
    """Update interview state in Redis, resetting TTL."""
    r = await _get_redis()
    await r.setex(session_token, SESSION_TTL, json.dumps(state, default=str))


async def delete_session(session_token: str) -> None:
    """Delete a session from Redis."""
    r = await _get_redis()
    await r.delete(session_token)


async def close_redis() -> None:
    """Close the Redis connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
