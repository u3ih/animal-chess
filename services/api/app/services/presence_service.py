"""Online presence, backed by a Redis hash. A server restart clears it (same as Node today).

Keyed by the principal's ``external_key`` (google email or guest uuid). Every change
publishes the full snapshot to ``PRESENCE_CHANNEL`` so subscribers just replace their list.
"""

import json

from app.events import PRESENCE_CHANNEL, get_redis, publish

_KEY = "presence"


async def _snapshot() -> list[dict]:
    raw = await get_redis().hgetall(_KEY)
    out: list[dict] = []
    for value in raw.values():
        try:
            out.append(json.loads(value))
        except json.JSONDecodeError:
            continue
    return out


async def snapshot() -> list[dict]:
    return await _snapshot()


async def online_keys() -> set[str]:
    return set(await get_redis().hkeys(_KEY))


async def set_online(external_key: str, username: str, room_id: str | None = None) -> None:
    entry = {"userId": external_key, "username": username, "roomId": room_id}
    await get_redis().hset(_KEY, external_key, json.dumps(entry))
    await publish(PRESENCE_CHANNEL, {"presence": await _snapshot()})


async def set_room(external_key: str, room_id: str | None) -> None:
    raw = await get_redis().hget(_KEY, external_key)
    if raw is None:
        return
    entry = json.loads(raw)
    entry["roomId"] = room_id
    await get_redis().hset(_KEY, external_key, json.dumps(entry))
    await publish(PRESENCE_CHANNEL, {"presence": await _snapshot()})


async def set_offline(external_key: str) -> None:
    await get_redis().hdel(_KEY, external_key)
    await publish(PRESENCE_CHANNEL, {"presence": await _snapshot()})
