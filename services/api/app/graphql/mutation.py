"""Public Mutation root."""

import strawberry
from graphql import GraphQLError

from app.enums import FriendRequestStatus
from app.graphql import mappers
from app.graphql import types as t
from app.graphql.context import db_of, require_google
from app.services import (
    chat_service,
    cosmetic_service,
    friend_service,
    lobby_service,
    login_service,
    quest_service,
    user_service,
)
from app.services.chat_service import ChatError
from app.services.cosmetic_service import CosmeticError
from app.services.friend_service import FriendError
from app.services.validation import ValidationError


async def _friend_request_gql(db, request) -> t.FriendRequest:
    frm = await user_service.get_user(db, request.from_user_id)
    to = await user_service.get_user(db, request.to_user_id)
    return t.FriendRequest(
        id=strawberry.ID(str(request.id)),
        from_user=mappers.user(frm),
        to_user=mappers.user(to),
        status=FriendRequestStatus(request.status),
        created_at=request.created_at,
    )


@strawberry.type
class Mutation:
    @strawberry.mutation(description="Change your display name (2–24 chars, must be unique).")
    async def update_username(self, info: strawberry.Info, username: str) -> t.User:
        principal = await require_google(info)
        try:
            user = await user_service.update_username(db_of(info), principal.user_id, username)
        except ValidationError as exc:
            raise GraphQLError(str(exc)) from exc
        return mappers.user(user)

    @strawberry.mutation
    async def send_friend_request(
        self, info: strawberry.Info, to_user_id: strawberry.ID | None = None, to_username: str | None = None
    ) -> t.FriendRequest:
        principal = await require_google(info)
        try:
            request = await friend_service.send_request(
                db_of(info),
                principal.user_id,
                to_user_id=int(to_user_id) if to_user_id else None,
                to_username=to_username,
            )
        except FriendError as exc:
            raise GraphQLError(str(exc)) from exc
        return await _friend_request_gql(db_of(info), request)

    @strawberry.mutation
    async def respond_friend_request(self, info: strawberry.Info, id: strawberry.ID, accept: bool) -> t.FriendRequest:
        principal = await require_google(info)
        try:
            request = await friend_service.respond_request(db_of(info), principal.user_id, int(id), accept)
        except FriendError as exc:
            raise GraphQLError(str(exc)) from exc
        return await _friend_request_gql(db_of(info), request)

    @strawberry.mutation
    async def cancel_friend_request(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        principal = await require_google(info)
        return await friend_service.cancel_request(db_of(info), principal.user_id, int(id))

    @strawberry.mutation
    async def remove_friend(self, info: strawberry.Info, user_id: strawberry.ID) -> bool:
        principal = await require_google(info)
        return await friend_service.remove_friend(db_of(info), principal.user_id, int(user_id))

    @strawberry.mutation(description="Claim the once-per-day login bonus (idempotent per day).")
    async def claim_daily_bonus(self, info: strawberry.Info) -> t.RewardResult:
        principal = await require_google(info)
        result = await login_service.claim_daily(db_of(info), principal.user_id)
        return t.RewardResult(
            claimed=result.claimed,
            coins=result.coins,
            xp=result.xp,
            leveled_up=result.leveled_up,
            level=result.level,
            streak=result.streak,
            multiplier=result.multiplier,
        )

    @strawberry.mutation(description="Claim a completed daily quest (idempotent).")
    async def claim_quest(self, info: strawberry.Info, quest_id: strawberry.ID) -> t.RewardResult:
        principal = await require_google(info)
        outcome = await quest_service.claim_quest(db_of(info), principal.user_id, int(quest_id))
        if outcome is None:
            raise GraphQLError("quest not claimable")
        return t.RewardResult(
            claimed=True,
            coins=outcome.coins,
            xp=outcome.xp,
            leveled_up=outcome.leveled_up,
            level=outcome.level,
        )

    @strawberry.mutation(description="Send a private message to a friend (friends-only, ≤500 chars).")
    async def send_direct_message(
        self, info: strawberry.Info, to_user_id: strawberry.ID, body: str
    ) -> t.DirectMessage:
        principal = await require_google(info)
        try:
            message = await chat_service.send_message(db_of(info), principal.user_id, int(to_user_id), body)
        except ChatError as exc:
            raise GraphQLError(str(exc)) from exc
        return t.DirectMessage(
            id=strawberry.ID(str(message.id)),
            from_user_id=strawberry.ID(str(message.sender_id)),
            to_user_id=strawberry.ID(str(message.recipient_id)),
            body=message.body,
            created_at=message.created_at,
            read_at=message.read_at,
        )

    @strawberry.mutation(description="Mark every message from one friend as read.")
    async def mark_dm_read(self, info: strawberry.Info, friend_id: strawberry.ID) -> bool:
        principal = await require_google(info)
        await chat_service.mark_read(db_of(info), principal.user_id, int(friend_id))
        return True

    @strawberry.mutation(description="Invite a friend to your current Node room (by room code).")
    async def send_room_invite(self, info: strawberry.Info, to_user_id: strawberry.ID, room_code: str) -> bool:
        principal = await require_google(info)
        me = await user_service.get_user(db_of(info), principal.user_id)
        if me is None:
            return False
        return await lobby_service.send_invite(db_of(info), me, int(to_user_id), room_code)

    @strawberry.mutation(description="Buy a costume with coins (google-only, idempotent per costume).")
    async def purchase_cosmetic(self, info: strawberry.Info, cosmetic_id: str) -> t.PurchaseResult:
        principal = await require_google(info)
        try:
            outcome = await cosmetic_service.purchase(db_of(info), principal.user_id, cosmetic_id)
        except CosmeticError as exc:
            raise GraphQLError(str(exc)) from exc
        return t.PurchaseResult(cosmetic_id=outcome.cosmetic_id, coins=outcome.coins)
