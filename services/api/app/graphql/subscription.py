"""Public Subscription root — realtime fan-out from Redis pub/sub.

Per-user channels are authorized by the context principal (never a client-supplied id).
"""

from collections.abc import AsyncGenerator
from datetime import datetime

import strawberry

from app.enums import FriendRequestStatus, UserKind
from app.events import LOBBY_CHANNEL, PRESENCE_CHANNEL, subscribe, user_channel
from app.graphql import types as t
from app.graphql.context import require_google
from app.services import lobby_service, presence_service


def _parse_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        from app.core.time import utcnow

        return utcnow()


def _user(d: dict) -> t.User:
    return t.User(
        id=strawberry.ID(str(d.get("id"))),
        kind=UserKind(d.get("kind", "google")),
        username=d.get("username", ""),
        image=d.get("image"),
        is_ranked=d.get("kind") == "google",
    )


@strawberry.type
class Subscription:
    @strawberry.subscription(description="Online players (initial snapshot, then live updates).")
    async def presence(self, info: strawberry.Info) -> AsyncGenerator[list[t.PresenceEntry], None]:
        def to_entries(items: list[dict]) -> list[t.PresenceEntry]:
            return [
                t.PresenceEntry(user_id=e["userId"], username=e["username"], room_id=e.get("roomId")) for e in items
            ]

        yield to_entries(await presence_service.snapshot())
        async for msg in subscribe(PRESENCE_CHANNEL):
            yield to_entries(msg.get("presence", []))

    @strawberry.subscription(description="Incoming friend requests / accepts.")
    async def friend_events(self, info: strawberry.Info) -> AsyncGenerator[t.FriendEvent, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            kind = msg.get("type")
            if kind == "friendRequest":
                yield t.FriendEvent(
                    kind=t.FriendEventKind.REQUEST,
                    request=t.FriendRequest(
                        id=strawberry.ID(str(msg["id"])),
                        from_user=_user(msg["from"]),
                        to_user=_user(msg["to"]),
                        status=FriendRequestStatus(msg.get("status", "pending")),
                        created_at=_parse_dt(msg.get("createdAt")),
                    ),
                )
            elif kind == "friendAdded":
                yield t.FriendEvent(kind=t.FriendEventKind.ACCEPTED, user=_user(msg["user"]))
            elif kind == "friendResolved":
                yield t.FriendEvent(
                    kind=t.FriendEventKind.RESOLVED, status=FriendRequestStatus(msg.get("status", "declined"))
                )

    @strawberry.subscription(description="Room invites (carry a Node room code).")
    async def invites(self, info: strawberry.Info) -> AsyncGenerator[t.RoomInvite, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "invite":
                yield t.RoomInvite(from_user=_user(msg["fromUser"]), room_code=msg["roomCode"])

    @strawberry.subscription(description="Live ELO/tier changes after ranked matches.")
    async def rank_updates(self, info: strawberry.Info) -> AsyncGenerator[t.RankUpdate, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "rank":
                yield t.RankUpdate(
                    elo=msg["elo"], tier=t.Tier(msg["tier"]), division=msg.get("division"), delta=msg["delta"]
                )

    @strawberry.subscription(description="Live coin/XP/level changes.")
    async def wallet_updates(self, info: strawberry.Info) -> AsyncGenerator[t.WalletUpdate, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "wallet":
                yield t.WalletUpdate(
                    coins=msg["coins"], xp=msg["xp"], level=msg["level"], leveled_up=msg.get("leveledUp", False)
                )

    @strawberry.subscription(description="Live daily-quest progress.")
    async def quest_updates(self, info: strawberry.Info) -> AsyncGenerator[t.QuestUpdate, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "quest":
                yield t.QuestUpdate(
                    quest_id=strawberry.ID(str(msg["questId"])),
                    code=msg["code"],
                    progress=msg["progress"],
                    target=msg["target"],
                    completed=msg.get("completed", False),
                )

    @strawberry.subscription(description="'You earned…' reward + achievement + tier-promotion toasts.")
    async def reward_toasts(self, info: strawberry.Info) -> AsyncGenerator[t.RewardEvent, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "reward":
                tier = t.Tier(msg["tier"]) if msg.get("tier") else None
                yield t.RewardEvent(source=msg["source"], coins=msg["coins"], xp=msg["xp"], tier=tier)
            elif msg.get("type") == "achievement":
                yield t.RewardEvent(source="achievement", coins=0, xp=0, achievement=msg["code"])

    @strawberry.subscription(description="Private messages involving the caller (both directions).")
    async def direct_message_events(self, info: strawberry.Info) -> AsyncGenerator[t.DirectMessage, None]:
        principal = await require_google(info)
        async for msg in subscribe(user_channel(principal.user_id)):
            if msg.get("type") == "dm":
                yield t.DirectMessage(
                    id=strawberry.ID(str(msg["id"])),
                    from_user_id=strawberry.ID(str(msg["fromUserId"])),
                    to_user_id=strawberry.ID(str(msg["toUserId"])),
                    body=msg["body"],
                    created_at=_parse_dt(msg.get("createdAt")),
                )

    @strawberry.subscription(description="Open public lobby rooms (live).")
    async def lobby_updates(self, info: strawberry.Info) -> AsyncGenerator[list[t.LobbyRoom], None]:
        rooms = await lobby_service.list_rooms()
        yield [_lobby_room(r) for r in rooms]
        async for msg in subscribe(LOBBY_CHANNEL):
            yield [_lobby_room(r) for r in msg.get("rooms", [])]


def _lobby_room(r: dict) -> t.LobbyRoom:
    return t.LobbyRoom(
        code=r["code"],
        host_name=r.get("hostName", ""),
        host_tier=t.Tier(r["hostTier"]) if r.get("hostTier") else None,
        occupancy=int(r.get("occupancy", 0)),
        visibility=t.RoomVisibility(r.get("visibility", "public")),
        created_at=_parse_dt(r.get("createdAt")),
    )
