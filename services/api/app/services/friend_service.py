"""Friends + friend requests (persistent). Replaces the old in-memory Node social handlers."""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.narrowing import must
from app.core.time import utcnow
from app.enums import FriendRequestStatus
from app.events import publish_to_user
from app.models.social import FriendRequest, Friendship
from app.models.user import User


class FriendError(Exception):
    pass


def _pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


def user_payload(user: User) -> dict:
    return {"id": str(user.id), "username": user.username, "image": user.image_url, "kind": user.kind}


async def list_friends(session: AsyncSession, user_id: int) -> list[User]:
    stmt = select(Friendship).where(
        or_(col(Friendship.user_low_id) == user_id, col(Friendship.user_high_id) == user_id)
    )
    rows = (await session.execute(stmt)).scalars().all()
    other_ids = [r.user_high_id if r.user_low_id == user_id else r.user_low_id for r in rows]
    if not other_ids:
        return []
    users = (await session.execute(select(User).where(col(User.id).in_(other_ids)))).scalars().all()
    return list(users)


async def are_friends(session: AsyncSession, a: int, b: int) -> bool:
    low, high = _pair(a, b)
    return await session.get(Friendship, (low, high)) is not None


async def list_requests(session: AsyncSession, user_id: int, *, incoming: bool) -> list[FriendRequest]:
    column = col(FriendRequest.to_user_id) if incoming else col(FriendRequest.from_user_id)
    stmt = (
        select(FriendRequest)
        .where(column == user_id, col(FriendRequest.status) == FriendRequestStatus.PENDING.value)
        .order_by(col(FriendRequest.id).desc())
    )
    return list((await session.execute(stmt)).scalars().all())


async def _pending_between(session: AsyncSession, frm: int, to: int) -> FriendRequest | None:
    stmt = select(FriendRequest).where(
        col(FriendRequest.from_user_id) == frm,
        col(FriendRequest.to_user_id) == to,
        col(FriendRequest.status) == FriendRequestStatus.PENDING.value,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def _create_friendship(session: AsyncSession, a: int, b: int) -> None:
    low, high = _pair(a, b)
    if await session.get(Friendship, (low, high)) is None:
        session.add(Friendship(user_low_id=low, user_high_id=high))


async def send_request(
    session: AsyncSession, user_id: int, *, to_user_id: int | None, to_username: str | None
) -> FriendRequest:
    target: User | None = None
    if to_user_id is not None:
        target = await session.get(User, to_user_id)
    elif to_username:
        from app.services.user_service import get_user_by_username

        target = await get_user_by_username(session, to_username)
    if target is None or target.id == user_id:
        raise FriendError("invalid target")
    target_id = must(target.id, "id of the resolved target user")
    if await are_friends(session, user_id, target_id):
        raise FriendError("already friends")

    # Reciprocal pending ⇒ auto-accept.
    reverse = await _pending_between(session, target_id, user_id)
    if reverse is not None:
        reverse.status = FriendRequestStatus.ACCEPTED.value
        reverse.resolved_at = utcnow()
        session.add(reverse)
        await _create_friendship(session, user_id, target_id)
        await session.commit()
        me = must(await session.get(User, user_id), "the requesting user's row")
        await publish_to_user(target_id, "friendAdded", {"user": user_payload(me)})
        await publish_to_user(user_id, "friendAdded", {"user": user_payload(target)})
        return reverse

    if await _pending_between(session, user_id, target_id) is not None:
        raise FriendError("request already pending")

    request = FriendRequest(from_user_id=user_id, to_user_id=target_id, status=FriendRequestStatus.PENDING.value)
    session.add(request)
    await session.commit()
    await session.refresh(request)
    me = must(await session.get(User, user_id), "the requesting user's row")
    await publish_to_user(
        target_id,
        "friendRequest",
        {"id": str(request.id), "from": user_payload(me), "to": user_payload(target),
         "status": request.status, "createdAt": request.created_at},
    )
    return request


async def respond_request(session: AsyncSession, user_id: int, request_id: int, accept: bool) -> FriendRequest:
    request = await session.get(FriendRequest, request_id)
    if request is None or request.to_user_id != user_id or request.status != FriendRequestStatus.PENDING.value:
        raise FriendError("request not found")
    request.status = FriendRequestStatus.ACCEPTED.value if accept else FriendRequestStatus.DECLINED.value
    request.resolved_at = utcnow()
    session.add(request)
    if accept:
        await _create_friendship(session, request.from_user_id, user_id)
    await session.commit()
    await session.refresh(request)

    requester = must(await session.get(User, request.from_user_id), "the requesting user's row")
    me = must(await session.get(User, user_id), "the responding user's row")
    if accept:
        await publish_to_user(request.from_user_id, "friendAdded", {"user": user_payload(me)})
        await publish_to_user(user_id, "friendAdded", {"user": user_payload(requester)})
    else:
        await publish_to_user(request.from_user_id, "friendResolved", {"id": str(request.id), "status": request.status})
    return request


async def cancel_request(session: AsyncSession, user_id: int, request_id: int) -> bool:
    request = await session.get(FriendRequest, request_id)
    if request is None or request.from_user_id != user_id or request.status != FriendRequestStatus.PENDING.value:
        return False
    request.status = FriendRequestStatus.CANCELLED.value
    request.resolved_at = utcnow()
    session.add(request)
    await session.commit()
    return True


async def remove_friend(session: AsyncSession, user_id: int, other_id: int) -> bool:
    low, high = _pair(user_id, other_id)
    friendship = await session.get(Friendship, (low, high))
    if friendship is None:
        return False
    await session.delete(friendship)
    await session.commit()
    return True
