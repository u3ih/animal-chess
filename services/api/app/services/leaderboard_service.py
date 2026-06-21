"""Leaderboards (live ORDER BY over indexed columns) + a single user's rank."""

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import LeaderboardKind, Tier
from app.gamification import tier_for
from app.models.user import User, UserRating, UserWallet


@dataclass(slots=True)
class LeaderRow:
    rank: int
    user: User
    score: int
    tier: Tier | None


async def leaderboard(session: AsyncSession, kind: LeaderboardKind, limit: int) -> list[LeaderRow]:
    limit = min(limit, 100)
    if kind is LeaderboardKind.ELO:
        stmt = (
            select(User, UserRating.elo)
            .join(UserRating, UserRating.user_id == User.id)
            .order_by(UserRating.elo.desc())
            .limit(limit)
        )
        rows = (await session.execute(stmt)).all()
        return [LeaderRow(rank=i + 1, user=u, score=elo, tier=tier_for(elo)[0]) for i, (u, elo) in enumerate(rows)]

    score_col = UserWallet.coins if kind is LeaderboardKind.COINS else UserWallet.level
    if kind is LeaderboardKind.COINS:
        order = (UserWallet.coins.desc(),)
    else:
        order = (UserWallet.level.desc(), UserWallet.xp.desc())
    stmt = select(User, score_col).join(UserWallet, UserWallet.user_id == User.id).order_by(*order).limit(limit)
    rows = (await session.execute(stmt)).all()
    return [LeaderRow(rank=i + 1, user=u, score=score, tier=None) for i, (u, score) in enumerate(rows)]


async def my_rank(session: AsyncSession, user_id: int, kind: LeaderboardKind) -> int | None:
    if kind is LeaderboardKind.ELO:
        mine = await session.get(UserRating, user_id)
        if mine is None:
            return None
        ahead = await session.scalar(select(func.count()).select_from(UserRating).where(UserRating.elo > mine.elo))
        return (ahead or 0) + 1

    mine = await session.get(UserWallet, user_id)
    if mine is None:
        return None
    if kind is LeaderboardKind.COINS:
        ahead = await session.scalar(select(func.count()).select_from(UserWallet).where(UserWallet.coins > mine.coins))
    else:
        ahead = await session.scalar(
            select(func.count()).select_from(UserWallet).where(UserWallet.level > mine.level)
        )
    return (ahead or 0) + 1
