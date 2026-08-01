"""Achievements. Unlock is idempotent (PK pair); unlocking grants its reward."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.core.narrowing import must
from app.enums import RewardSource, Tier
from app.gamification import TIER_ORDER, tier_for
from app.models.achievement import AchievementDefinition, UserAchievement
from app.services import reward_service

_TIER_ACHIEVEMENTS = [
    (Tier.GOLD, "REACH_GOLD"),
    (Tier.DIAMOND, "REACH_DIAMOND"),
    (Tier.MASTER, "REACH_MASTER"),
    (Tier.GRANDMASTER, "REACH_GRANDMASTER"),
]


async def _def_by_code(session: AsyncSession, code: str) -> AchievementDefinition | None:
    return (
        await session.execute(select(AchievementDefinition).where(col(AchievementDefinition.code) == code))
    ).scalar_one_or_none()


async def unlock(session: AsyncSession, user_id: int, code: str) -> bool:
    """Unlock + grant reward if not already held. Returns True when newly unlocked. No commit."""
    definition = await _def_by_code(session, code)
    if definition is None:
        return False
    existing = await session.get(UserAchievement, (user_id, definition.id))
    if existing is not None:
        return False
    session.add(UserAchievement(user_id=user_id, achievement_id=definition.id))
    await reward_service.grant(
        session,
        user_id,
        coins=definition.reward_coins,
        xp=definition.reward_xp,
        source=RewardSource.ACHIEVEMENT,
        ref_id=f"achievement:{code}",
    )
    return True


async def evaluate_for_match(
    session: AsyncSession,
    user_id: int,
    *,
    elo_after: int,
    total_wins: int,
    win_streak_value: int,
    captured_kinds: list[str],
    won: bool,
    reason: str | None,
) -> list[str]:
    """Check match-driven achievements and unlock any newly earned. Returns newly-unlocked codes. No commit."""
    candidates: list[str] = []
    if won and total_wins == 1:
        candidates.append("FIRST_WIN")
    if win_streak_value >= 5:
        candidates.append("WIN_STREAK_5")
    if won and reason == "den":
        candidates.append("DEN_RAIDER")
    if "elephant" in captured_kinds:
        candidates.append("ELEPHANT_HUNTER")
    tier, _ = tier_for(elo_after)
    tier_idx = TIER_ORDER.index(tier)
    candidates.extend(code for t, code in _TIER_ACHIEVEMENTS if tier_idx >= TIER_ORDER.index(t))

    unlocked: list[str] = []
    for code in candidates:
        if await unlock(session, user_id, code):
            unlocked.append(code)
    return unlocked


async def list_for_user(
    session: AsyncSession, user_id: int | None
) -> list[tuple[AchievementDefinition, bool, datetime | None]]:
    defs = list((await session.execute(select(AchievementDefinition))).scalars().all())
    held: dict[int, datetime | None] = {}
    if user_id is not None:
        rows = (
            await session.execute(select(UserAchievement).where(col(UserAchievement.user_id) == user_id))
        ).scalars().all()
        held = {r.achievement_id: r.unlocked_at for r in rows}
    out: list[tuple[AchievementDefinition, bool, datetime | None]] = []
    for d in defs:
        def_id = must(d.id, "achievement definition id")
        out.append((d, def_id in held, held.get(def_id)))
    return out
