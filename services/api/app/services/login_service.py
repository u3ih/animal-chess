"""Daily-login bonus with streak multiplier. Idempotent per server-day."""

from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import server_day
from app.enums import QuestKind, RewardSource
from app.events import publish_to_user
from app.gamification import daily_multiplier, daily_reward
from app.models.gamification import DailyLoginLog, LoginStreak
from app.services import quest_service, reward_service


@dataclass(slots=True)
class DailyClaimResult:
    claimed: bool  # False if it was already claimed today
    coins: int
    xp: int
    streak: int
    multiplier: float
    leveled_up: bool
    level: int


@dataclass(slots=True)
class DailyStatus:
    claimable: bool
    streak: int
    next_multiplier: float


async def _ensure_streak(session: AsyncSession, user_id: int) -> LoginStreak:
    streak = await session.get(LoginStreak, user_id)
    if streak is None:
        streak = LoginStreak(user_id=user_id)
        session.add(streak)
        await session.flush()
    return streak


async def daily_status(session: AsyncSession, user_id: int) -> DailyStatus:
    today = server_day()
    streak = await _ensure_streak(session, user_id)
    await session.commit()
    claimed_today = streak.last_claim_day == today
    continues = streak.last_claim_day == today - timedelta(days=1)
    next_streak_day = (streak.current_streak + 1) if continues else 1
    return DailyStatus(
        claimable=not claimed_today,
        streak=streak.current_streak,
        next_multiplier=daily_multiplier(next_streak_day),
    )


async def claim_daily(session: AsyncSession, user_id: int) -> DailyClaimResult:
    today = server_day()
    streak = await _ensure_streak(session, user_id)

    if await session.get(DailyLoginLog, (user_id, today)) is not None:
        await session.commit()
        return DailyClaimResult(
            claimed=False,
            coins=0,
            xp=0,
            streak=streak.current_streak,
            multiplier=daily_multiplier(max(streak.current_streak, 1)),
            leveled_up=False,
            level=0,
        )

    continues = streak.last_claim_day == today - timedelta(days=1)
    streak_day = (streak.current_streak + 1) if continues else 1
    coins, xp = daily_reward(streak_day)

    streak.current_streak = streak_day
    streak.longest_streak = max(streak.longest_streak, streak_day)
    streak.last_claim_day = today
    session.add(streak)
    session.add(DailyLoginLog(user_id=user_id, day=today, streak_day=streak_day, coins=coins, xp=xp))

    outcome = await reward_service.grant(
        session, user_id, coins=coins, xp=xp, source=RewardSource.LOGIN, ref_id=f"login:{today.isoformat()}"
    )
    await quest_service.bump(session, user_id, QuestKind.LOGIN, amount=1)
    await session.commit()

    await publish_to_user(
        user_id, "wallet", {"coins": outcome.total_coins, "xp": outcome.total_xp, "level": outcome.level,
                            "leveledUp": outcome.leveled_up}
    )
    await publish_to_user(
        user_id, "reward", {"source": RewardSource.LOGIN.value, "coins": outcome.coins, "xp": outcome.xp}
    )
    return DailyClaimResult(
        claimed=True,
        coins=outcome.coins,
        xp=outcome.xp,
        streak=streak_day,
        multiplier=daily_multiplier(streak_day),
        leveled_up=outcome.leveled_up,
        level=outcome.level,
    )
