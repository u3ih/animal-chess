"""Public Query root."""

import strawberry

from app.enums import FriendRequestStatus, MatchReason, MatchResult, QuestKind
from app.enums import LeaderboardKind as LeaderboardKindEnum
from app.graphql import mappers
from app.graphql import types as t
from app.graphql.context import db_of, get_principal, require_google
from app.services import (
    achievement_service,
    friend_service,
    leaderboard_service,
    lobby_service,
    login_service,
    match_service,
    presence_service,
    quest_service,
    user_service,
)


@strawberry.type
class Query:
    @strawberry.field(description="The signed-in player's profile, rank and wallet. Null for guests/anonymous.")
    async def me(self, info: strawberry.Info) -> t.Me | None:
        principal = await get_principal(info)
        if principal is None or not principal.is_ranked:
            return None
        agg = await user_service.get_me(db_of(info), principal.user_id)
        if agg is None:
            return None
        rank = await leaderboard_service.my_rank(db_of(info), principal.user_id, LeaderboardKindEnum.ELO)
        return t.Me(
            user=mappers.user(agg.user),
            rating=mappers.rating(agg.rating, leaderboard_rank=rank),
            wallet=mappers.wallet(agg.wallet),
            streaks=mappers.streaks(agg.login, agg.win),
        )

    @strawberry.field(description="Prefix-search google users by username (for adding friends).")
    async def search_users(self, info: strawberry.Info, query: str, limit: int = 10) -> list[t.User]:
        principal = await require_google(info)
        users = await user_service.search_users(db_of(info), query, limit, exclude_id=principal.user_id)
        return [mappers.user(u) for u in users]

    @strawberry.field
    async def friends(self, info: strawberry.Info) -> list[t.Friend]:
        principal = await require_google(info)
        users = await friend_service.list_friends(db_of(info), principal.user_id)
        online = await presence_service.online_keys()
        presence = {e["userId"]: e for e in await presence_service.snapshot()}
        out: list[t.Friend] = []
        for u in users:
            key = u.email or ""
            entry = presence.get(key)
            out.append(
                t.Friend(
                    user=mappers.user(u),
                    online=key in online,
                    in_room=entry.get("roomId") if entry else None,
                )
            )
        return out

    @strawberry.field
    async def friend_requests(self, info: strawberry.Info, incoming: bool = True) -> list[t.FriendRequest]:
        principal = await require_google(info)
        rows = await friend_service.list_requests(db_of(info), principal.user_id, incoming=incoming)
        db = db_of(info)
        out: list[t.FriendRequest] = []
        for r in rows:
            frm = await user_service.get_user(db, r.from_user_id)
            to = await user_service.get_user(db, r.to_user_id)
            if frm and to:
                out.append(
                    t.FriendRequest(
                        id=strawberry.ID(str(r.id)),
                        from_user=mappers.user(frm),
                        to_user=mappers.user(to),
                        status=FriendRequestStatus(r.status),
                        created_at=r.created_at,
                    )
                )
        return out

    @strawberry.field
    async def rank_me(self, info: strawberry.Info) -> t.Rating | None:
        principal = await require_google(info)
        agg = await user_service.get_me(db_of(info), principal.user_id)
        if agg is None:
            return None
        rank = await leaderboard_service.my_rank(db_of(info), principal.user_id, LeaderboardKindEnum.ELO)
        return mappers.rating(agg.rating, leaderboard_rank=rank)

    @strawberry.field
    async def leaderboard(
        self, info: strawberry.Info, kind: t.LeaderboardKind = t.LeaderboardKind.ELO, limit: int = 50
    ) -> list[t.LeaderboardEntry]:
        rows = await leaderboard_service.leaderboard(db_of(info), LeaderboardKindEnum(kind.value), limit)
        return [
            t.LeaderboardEntry(rank=r.rank, user=mappers.user(r.user), score=r.score, tier=r.tier) for r in rows
        ]

    @strawberry.field(description="Today's quests (lazily assigned on first read).")
    async def quests(self, info: strawberry.Info) -> list[t.Quest]:
        principal = await require_google(info)
        views = await quest_service.todays_quests(db_of(info), principal.user_id)
        return [
            t.Quest(
                id=strawberry.ID(str(v.row.quest_id)),
                code=v.definition.code,
                kind=QuestKind(v.definition.kind),
                progress=v.row.progress,
                target=v.row.target,
                reward_coins=v.definition.reward_coins,
                reward_xp=v.definition.reward_xp,
                completed=v.row.completed_at is not None,
                claimed=v.row.claimed_at is not None,
            )
            for v in views
        ]

    @strawberry.field
    async def achievements(self, info: strawberry.Info) -> list[t.Achievement]:
        principal = await get_principal(info)
        user_id = principal.user_id if (principal and principal.is_ranked) else None
        rows = await achievement_service.list_for_user(db_of(info), user_id)
        return [
            t.Achievement(
                code=d.code,
                unlocked=unlocked,
                unlocked_at=unlocked_at,
                reward_coins=d.reward_coins,
                reward_xp=d.reward_xp,
            )
            for d, unlocked, unlocked_at in rows
        ]

    @strawberry.field
    async def matches(self, info: strawberry.Info, limit: int = 20, before_id: int | None = None) -> list[t.Match]:
        principal = await require_google(info)
        rows = await match_service.list_matches(db_of(info), principal.user_id, limit, before_id)
        out: list[t.Match] = []
        for row in rows:
            elo_delta = (
                row.me.elo_after - row.me.elo_before
                if row.me.elo_after is not None and row.me.elo_before is not None
                else None
            )
            out.append(
                t.Match(
                    external_id=strawberry.ID(row.match.external_id),
                    opponent=mappers.user(row.opponent) if row.opponent else None,
                    result=MatchResult(row.me.result),
                    reason=MatchReason(row.match.reason) if row.match.reason else None,
                    elo_delta=elo_delta,
                    coins=row.me.coins_awarded,
                    xp=row.me.xp_awarded,
                    ended_at=row.match.ended_at,
                )
            )
        return out

    @strawberry.field
    async def daily_status(self, info: strawberry.Info) -> t.DailyStatus:
        principal = await require_google(info)
        status = await login_service.daily_status(db_of(info), principal.user_id)
        return t.DailyStatus(claimable=status.claimable, streak=status.streak, next_multiplier=status.next_multiplier)

    @strawberry.field(description="Open public rooms to join.")
    async def lobby(self, info: strawberry.Info) -> list[t.LobbyRoom]:
        from datetime import datetime

        rooms = await lobby_service.list_rooms()
        out: list[t.LobbyRoom] = []
        for r in rooms:
            out.append(
                t.LobbyRoom(
                    code=r["code"],
                    host_name=r.get("hostName", ""),
                    host_tier=t.Tier(r["hostTier"]) if r.get("hostTier") else None,
                    occupancy=int(r.get("occupancy", 0)),
                    visibility=t.RoomVisibility(r.get("visibility", "public")),
                    created_at=datetime.fromisoformat(r["createdAt"]),
                )
            )
        return out
