"""Public lobby of open rooms. Node is the source of truth (it owns live room state);
this is a rebuildable Redis cache that clients query + subscribe to.

Each change publishes the full open-room list to ``LOBBY_CHANNEL``.
"""

import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.time import utcnow
from app.enums import RoomVisibility
from app.events import LOBBY_CHANNEL, get_redis, publish, publish_to_user
from app.gamification import tier_for
from app.models.user import User, UserRating

_KEY = "lobby"


async def _all_rooms() -> list[dict]:
    raw = await get_redis().hgetall(_KEY)
    rooms: list[dict] = []
    for value in raw.values():
        try:
            rooms.append(json.loads(value))
        except json.JSONDecodeError:
            continue
    return rooms


def _open(room: dict) -> bool:
    return room.get("visibility") == RoomVisibility.PUBLIC.value and int(room.get("occupancy", 0)) < 2


async def list_rooms() -> list[dict]:
    rooms = [r for r in await _all_rooms() if _open(r)]
    rooms.sort(key=lambda r: r.get("createdAt", ""), reverse=True)
    return rooms


async def _publish_list() -> None:
    await publish(LOBBY_CHANNEL, {"rooms": await list_rooms()})


async def _host_tier(session: AsyncSession, host_id: str) -> str | None:
    if "@" not in host_id:
        return None
    user = (await session.execute(select(User).where(col(User.email) == host_id))).scalar_one_or_none()
    if user is None:
        return None
    rating = await session.get(UserRating, user.id)
    if rating is None:
        return None
    tier, _ = tier_for(rating.elo)
    return tier.value


async def register_room(
    session: AsyncSession,
    *,
    code: str,
    host_id: str,
    host_name: str,
    visibility: str,
    created_at: datetime | None = None,
) -> None:
    entry = {
        "code": code,
        "hostId": host_id,
        "hostName": host_name,
        "hostTier": await _host_tier(session, host_id),
        "occupancy": 1,
        "visibility": visibility,
        "createdAt": (created_at or utcnow()).isoformat(),
    }
    await get_redis().hset(_KEY, code, json.dumps(entry))
    await _publish_list()


async def update_room(code: str, occupancy: int) -> None:
    raw = await get_redis().hget(_KEY, code)
    if raw is None:
        return
    entry = json.loads(raw)
    entry["occupancy"] = occupancy
    await get_redis().hset(_KEY, code, json.dumps(entry))
    await _publish_list()


async def close_room(code: str) -> None:
    await get_redis().hdel(_KEY, code)
    await _publish_list()


async def reconcile(rooms: list[dict]) -> None:
    """Replace the registry with Node's authoritative snapshot (called on Python startup)."""
    redis = get_redis()
    await redis.delete(_KEY)
    if rooms:
        await redis.hset(_KEY, mapping={r["code"]: json.dumps(r) for r in rooms})
    await _publish_list()


async def send_invite(session: AsyncSession, from_user: User, to_user_id: int, room_code: str) -> bool:
    target = await session.get(User, to_user_id)
    if target is None:
        return False
    await publish_to_user(
        to_user_id,
        "invite",
        {"fromUser": {"id": str(from_user.id), "username": from_user.username,
                      "image": from_user.image_url, "kind": from_user.kind}, "roomCode": room_code},
    )
    return True
