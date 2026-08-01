"""Cosmetic shop — buying costumes with coins. Server owns *ownership* only; equip state lives
client-side (localStorage) so it works offline / for guests / on the static export.

The price catalog mirrors ``apps/web/src/components/three/skins/costumes.tsx`` — keep the two in sync.
"""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.enums import RewardSource
from app.events import publish_to_user
from app.models.cosmetic import UserCosmetic
from app.models.user import UserWallet
from app.services import reward_service

# Paid costumes only. Price-0 costumes ("none") are free by default and never stored.
CATALOG: dict[str, int] = {
    "straw_hat": 120,
    "gold_crown": 400,
    "cape": 220,
}


class CosmeticError(Exception):
    """Purchase rejected (unknown id / insufficient coins)."""


@dataclass(slots=True)
class PurchaseOutcome:
    cosmetic_id: str
    coins: int  # wallet balance after the purchase


async def list_owned(session: AsyncSession, user_id: int) -> list[str]:
    rows = await session.execute(select(UserCosmetic.cosmetic_id).where(UserCosmetic.user_id == user_id))
    return list(rows.scalars().all())


async def purchase(session: AsyncSession, user_id: int, cosmetic_id: str) -> PurchaseOutcome:
    price = CATALOG.get(cosmetic_id)
    if price is None:
        raise CosmeticError("unknown cosmetic")

    wallet = await session.get(UserWallet, user_id)
    balance = wallet.coins if wallet else 0

    # Already owned → idempotent, no charge.
    if await session.get(UserCosmetic, (user_id, cosmetic_id)) is not None:
        return PurchaseOutcome(cosmetic_id=cosmetic_id, coins=balance)

    if balance < price:
        raise CosmeticError("not enough coins")

    session.add(UserCosmetic(user_id=user_id, cosmetic_id=cosmetic_id))
    outcome = await reward_service.grant(
        session,
        user_id,
        coins=-price,
        xp=0,
        source=RewardSource.PURCHASE,
        ref_id=f"cosmetic:{cosmetic_id}",
    )
    await session.commit()
    await publish_to_user(
        user_id,
        "wallet",
        {"coins": outcome.total_coins, "xp": outcome.total_xp, "level": outcome.level, "leveledUp": outcome.leveled_up},
    )
    return PurchaseOutcome(cosmetic_id=cosmetic_id, coins=outcome.total_coins)
