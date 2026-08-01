"""Granting coins/XP. Single funnel so every award hits the ledger and recomputes level.

Does NOT commit — callers own the transaction (match report, daily claim, quest claim).
"""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import RewardSource
from app.gamification import level_for_xp, level_up_bonus
from app.models.user import UserWallet, WalletLedger


@dataclass(slots=True)
class RewardOutcome:
    coins: int  # total coins granted (incl. any level-up bonus)
    xp: int
    leveled_up: bool
    level: int
    total_coins: int
    total_xp: int


async def grant(
    session: AsyncSession,
    user_id: int,
    *,
    coins: int,
    xp: int,
    source: RewardSource,
    ref_id: str | None = None,
) -> RewardOutcome:
    wallet = await session.get(UserWallet, user_id)
    if wallet is None:
        wallet = UserWallet(user_id=user_id)
        session.add(wallet)
        await session.flush()

    old_level = wallet.level
    wallet.coins += coins
    wallet.xp += xp
    granted_coins = coins
    if coins or xp:
        session.add(
            WalletLedger(user_id=user_id, delta_coins=coins, delta_xp=xp, source=source.value, ref_id=ref_id)
        )

    new_level = level_for_xp(wallet.xp)
    leveled_up = new_level > old_level
    if leveled_up:
        bonus = level_up_bonus(old_level, new_level)
        wallet.coins += bonus
        granted_coins += bonus
        wallet.level = new_level
        session.add(
            WalletLedger(
                user_id=user_id, delta_coins=bonus, delta_xp=0, source=RewardSource.LEVEL_UP.value, ref_id=ref_id
            )
        )
    else:
        wallet.level = new_level

    session.add(wallet)
    await session.flush()
    return RewardOutcome(
        coins=granted_coins,
        xp=xp,
        leveled_up=leveled_up,
        level=wallet.level,
        total_coins=wallet.coins,
        total_xp=wallet.xp,
    )
