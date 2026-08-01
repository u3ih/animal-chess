"""User identity + the me/profile aggregate."""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.narrowing import must
from app.core.time import utcnow
from app.enums import UserKind
from app.models.gamification import LoginStreak, WinStreak
from app.models.user import User, UserRating, UserWallet
from app.services.validation import ValidationError, clean_username


@dataclass(slots=True)
class MeAggregate:
    user: User
    rating: UserRating | None
    wallet: UserWallet
    login: LoginStreak
    win: WinStreak


async def _user_by_email(session: AsyncSession, email: str) -> User | None:
    return (await session.execute(select(User).where(col(User.email) == email))).scalar_one_or_none()


async def get_user(session: AsyncSession, user_id: int) -> User | None:
    return await session.get(User, user_id)


async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
    stmt = select(User).where(func.lower(User.username) == username.strip().lower())
    return (await session.execute(stmt)).scalar_one_or_none()


async def _unique_username(session: AsyncSession, base: str) -> str:
    candidate = base
    for suffix in range(2, 60):
        existing = await get_user_by_username(session, candidate)
        if existing is None:
            return candidate
        candidate = f"{base[:20]}_{suffix}"
    return f"{base[:18]}_{int(utcnow().timestamp()) % 100000}"


async def ensure_progress_rows(session: AsyncSession, user_id: int) -> None:
    """Create the rating/wallet/streak rows for a (google) user if missing."""
    if await session.get(UserRating, user_id) is None:
        session.add(UserRating(user_id=user_id))
    if await session.get(UserWallet, user_id) is None:
        session.add(UserWallet(user_id=user_id))
    if await session.get(LoginStreak, user_id) is None:
        session.add(LoginStreak(user_id=user_id))
    if await session.get(WinStreak, user_id) is None:
        session.add(WinStreak(user_id=user_id))


async def upsert_google_user(
    session: AsyncSession,
    *,
    email: str,
    external_id: str | None,
    username: str,
    image: str | None,
) -> User:
    """Get-or-create a google user. Never overwrites a customized username."""
    user = await _user_by_email(session, email)
    if user is None:
        user = User(
            kind=UserKind.GOOGLE.value,
            email=email,
            external_id=external_id,
            username=await _unique_username(session, username),
            image_url=image,
            last_seen_at=utcnow(),
        )
        session.add(user)
        await session.flush()
        await ensure_progress_rows(session, must(user.id, "user.id after flush"))
        await session.commit()
        await session.refresh(user)
        return user

    # Light refresh of mutable profile bits; keep the (possibly customized) username.
    changed = False
    if image and user.image_url != image:
        user.image_url = image
        changed = True
    if external_id and user.external_id != external_id:
        user.external_id = external_id
        changed = True
    user.last_seen_at = utcnow()
    await ensure_progress_rows(session, must(user.id, "user.id of a persisted row"))
    if changed:
        session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_me(session: AsyncSession, user_id: int) -> MeAggregate | None:
    user = await session.get(User, user_id)
    if user is None:
        return None
    await ensure_progress_rows(session, user_id)
    await session.commit()
    # ensure_progress_rows + commit above guarantee every row below exists (rating stays optional —
    # guests never get one).
    rating = await session.get(UserRating, user_id)
    wallet = await session.get(UserWallet, user_id)
    login = await session.get(LoginStreak, user_id)
    win = await session.get(WinStreak, user_id)
    return MeAggregate(
        user=user,
        rating=rating,
        wallet=must(wallet, "user_wallet row"),
        login=must(login, "login_streak row"),
        win=must(win, "win_streak row")
    )


async def update_username(session: AsyncSession, user_id: int, raw: str) -> User:
    username = clean_username(raw)
    existing = await get_user_by_username(session, username)
    if existing is not None and existing.id != user_id:
        raise ValidationError("username taken")
    user = await session.get(User, user_id)
    if user is None:
        raise ValidationError("user not found")
    user.username = username
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def search_users(session: AsyncSession, query: str, limit: int, exclude_id: int | None) -> list[User]:
    q = query.strip().lower()
    if len(q) < 2:
        return []
    stmt = (
        select(User)
        .where(col(User.kind) == UserKind.GOOGLE.value)
        .where(func.lower(User.username).like(f"{q}%"))
        .order_by(func.lower(User.username))
        .limit(min(limit, 25))
    )
    rows = list((await session.execute(stmt)).scalars().all())
    return [u for u in rows if u.id != exclude_id]
