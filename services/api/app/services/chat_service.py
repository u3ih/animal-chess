"""Private chat between friends. Messages persist; delivery fans out over per-user channels.

Friends-only by design: no unsolicited DMs, so no separate block/report surface is needed yet.
"""

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utcnow
from app.events import publish_to_user
from app.models.chat import DirectMessage
from app.services.friend_service import are_friends

MAX_BODY_LENGTH = 500
MAX_PAGE = 100


class ChatError(Exception):
    pass


def _pair_filter(a: int, b: int):
    return or_(
        and_(DirectMessage.sender_id == a, DirectMessage.recipient_id == b),
        and_(DirectMessage.sender_id == b, DirectMessage.recipient_id == a),
    )


async def send_message(session: AsyncSession, sender_id: int, recipient_id: int, body: str) -> DirectMessage:
    text = body.strip()
    if not text:
        raise ChatError("empty message")
    if len(text) > MAX_BODY_LENGTH:
        raise ChatError("message too long")
    if sender_id == recipient_id or not await are_friends(session, sender_id, recipient_id):
        raise ChatError("not friends")

    message = DirectMessage(sender_id=sender_id, recipient_id=recipient_id, body=text)
    session.add(message)
    await session.commit()
    await session.refresh(message)

    payload = {
        "id": str(message.id),
        "fromUserId": str(sender_id),
        "toUserId": str(recipient_id),
        "body": message.body,
        "createdAt": message.created_at,
    }
    # Both sides get the push: recipient for delivery, sender for multi-tab echo.
    await publish_to_user(recipient_id, "dm", payload)
    await publish_to_user(sender_id, "dm", payload)
    return message


async def list_messages(
    session: AsyncSession, user_id: int, friend_id: int, *, limit: int = 50, before_id: int | None = None
) -> list[DirectMessage]:
    """Newest window of the thread, returned oldest→newest for direct rendering."""
    stmt = (
        select(DirectMessage)
        .where(_pair_filter(user_id, friend_id))
        .order_by(DirectMessage.id.desc())
        .limit(min(limit, MAX_PAGE))
    )
    if before_id is not None:
        stmt = stmt.where(DirectMessage.id < before_id)
    rows = list((await session.execute(stmt)).scalars().all())
    rows.reverse()
    return rows


async def mark_read(session: AsyncSession, user_id: int, friend_id: int) -> int:
    stmt = select(DirectMessage).where(
        DirectMessage.recipient_id == user_id,
        DirectMessage.sender_id == friend_id,
        DirectMessage.read_at.is_(None),
    )
    rows = list((await session.execute(stmt)).scalars().all())
    now = utcnow()
    for row in rows:
        row.read_at = now
        session.add(row)
    if rows:
        await session.commit()
    return len(rows)


async def unread_counts(session: AsyncSession, user_id: int) -> dict[int, int]:
    """Unread message count per friend (sender id → count)."""
    stmt = (
        select(DirectMessage.sender_id, func.count())
        .where(DirectMessage.recipient_id == user_id, DirectMessage.read_at.is_(None))
        .group_by(DirectMessage.sender_id)
    )
    return {sender_id: count for sender_id, count in (await session.execute(stmt)).all()}
