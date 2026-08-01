"""Redis-backed pub/sub powering GraphQL subscriptions (works across uvicorn workers).

Every realtime push goes through ``publish``; subscription resolvers consume via
``subscribe``. Per-user events go to ``user:{id}``; lobby/presence are global channels.
Each payload carries a ``"type"`` discriminator so one channel can multiplex event kinds.
"""

import json
from collections.abc import AsyncIterator

from redis.asyncio import Redis
from redis.asyncio import from_url as redis_from_url

from app.config import get_settings

LOBBY_CHANNEL = "lobby"
PRESENCE_CHANNEL = "presence"

_redis: Redis | None = None


async def init_redis() -> None:
    global _redis
    _redis = redis_from_url(get_settings().redis_url, decode_responses=True)
    await _redis.ping()


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> Redis:
    if _redis is None:
        raise RuntimeError("redis not initialized")
    return _redis


def user_channel(user_id: int) -> str:
    return f"user:{user_id}"


async def publish(channel: str, payload: dict) -> None:
    await get_redis().publish(channel, json.dumps(payload, default=str))


async def publish_to_user(user_id: int, type_: str, payload: dict) -> None:
    await publish(user_channel(user_id), {"type": type_, **payload})


async def subscribe(*channels: str) -> AsyncIterator[dict]:
    """Yield decoded message payloads from the given channels until the consumer stops."""
    pubsub = get_redis().pubsub()
    await pubsub.subscribe(*channels)
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                yield json.loads(message["data"])
            except (json.JSONDecodeError, TypeError):
                continue
    finally:
        await pubsub.unsubscribe(*channels)
        await pubsub.aclose()
