"""Internal GraphQL schema — only reachable via /internal/graphql, HMAC-guarded.

Node (the game server) calls these on game-over and room lifecycle changes.
"""

from datetime import datetime

import strawberry
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.db import get_session
from app.services import lobby_service, match_service


async def get_internal_context(db: AsyncSession = Depends(get_session)) -> dict:
    return {"db": db}


def _db(info) -> AsyncSession:
    return info.context["db"]


@strawberry.input
class PlayerInput:
    user_id: str
    color: str


@strawberry.input
class CapturedKindsInput:
    red: list[str] = strawberry.field(default_factory=list)
    blue: list[str] = strawberry.field(default_factory=list)


@strawberry.input
class MatchResultInput:
    match_id: str
    players: list[PlayerInput]
    winner: str | None
    reason: str | None
    moves: int
    started_at: datetime
    ended_at: datetime
    captured_kinds: CapturedKindsInput | None = None


@strawberry.input
class RoomInput:
    code: str
    host_id: str
    host_name: str
    visibility: str = "public"


@strawberry.type
class MatchAck:
    status: str
    ranked: bool


@strawberry.type
class InternalQuery:
    @strawberry.field
    def ping(self) -> str:
        return "ok"


@strawberry.type
class InternalMutation:
    @strawberry.mutation
    async def report_match_result(self, info: strawberry.Info, input: MatchResultInput) -> MatchAck:
        captured = {"red": [], "blue": []}
        if input.captured_kinds is not None:
            captured = {"red": input.captured_kinds.red, "blue": input.captured_kinds.blue}
        data = match_service.MatchResultInput(
            match_id=input.match_id,
            players=[match_service.PlayerInput(user_id=p.user_id, color=p.color) for p in input.players],
            winner=input.winner,
            reason=input.reason,
            moves=input.moves,
            started_at=input.started_at,
            ended_at=input.ended_at,
            captured_kinds=captured,
        )
        outcome = await match_service.report_result(_db(info), data)
        return MatchAck(status=outcome.status, ranked=outcome.is_ranked)

    @strawberry.mutation
    async def register_room(self, info: strawberry.Info, input: RoomInput) -> bool:
        await lobby_service.register_room(
            _db(info),
            code=input.code,
            host_id=input.host_id,
            host_name=input.host_name,
            visibility=input.visibility,
            created_at=utcnow(),
        )
        return True

    @strawberry.mutation
    async def update_room(self, info: strawberry.Info, code: str, occupancy: int) -> bool:
        await lobby_service.update_room(code, occupancy)
        return True

    @strawberry.mutation
    async def close_room(self, info: strawberry.Info, code: str) -> bool:
        await lobby_service.close_room(code)
        return True


schema = strawberry.Schema(query=InternalQuery, mutation=InternalMutation)
