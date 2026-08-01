"""Leaderboards (live ORDER BY over indexed columns) + a single user's rank."""

from dataclasses import dataclass

from sqlalchemy import UnaryExpression, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

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
        elo_stmt = (
            select(User, col(UserRating.elo))
            .join(UserRating, col(UserRating.user_id) == col(User.id))
            .order_by(col(UserRating.elo).desc())
            .limit(limit)
        )
        elo_rows = (await session.execute(elo_stmt)).all()
        return [LeaderRow(rank=i + 1, user=u, score=elo, tier=tier_for(elo)[0]) for i, (u, elo) in enumerate(elo_rows)]

    order: tuple[UnaryExpression, ...]
    if kind is LeaderboardKind.COINS:
        score_col = col(UserWallet.coins)
        order = (col(UserWallet.coins).desc(),)
    else:
        score_col = col(UserWallet.level)
        order = (col(UserWallet.level).desc(), col(UserWallet.xp).desc())
    wallet_stmt = (
        select(User, score_col).join(UserWallet, col(UserWallet.user_id) == col(User.id)).order_by(*order).limit(limit)
    )
    wallet_rows = (await session.execute(wallet_stmt)).all()
    return [LeaderRow(rank=i + 1, user=u, score=score, tier=None) for i, (u, score) in enumerate(wallet_rows)]


async def my_rank(session: AsyncSession, user_id: int, kind: LeaderboardKind) -> int | None:
    # COUNT(*) always yields exactly one row, so scalar_one() is total — unlike scalar(), it also
    # types as int rather than int | None.
    if kind is LeaderboardKind.ELO:
        rating = await session.get(UserRating, user_id)
        if rating is None:
            return None
        elo_stmt = select(func.count()).select_from(UserRating).where(col(UserRating.elo) > rating.elo)
        return (await session.execute(elo_stmt)).scalar_one() + 1

    wallet = await session.get(UserWallet, user_id)
    if wallet is None:
        return None
    if kind is LeaderboardKind.COINS:
        stmt = select(func.count()).select_from(UserWallet).where(col(UserWallet.coins) > wallet.coins)
    else:
        stmt = select(func.count()).select_from(UserWallet).where(col(UserWallet.level) > wallet.level)
    return (await session.execute(stmt)).scalar_one() + 1
