import pytest
from sqlalchemy import select

from app.enums import RewardSource
from app.models.user import UserWallet, WalletLedger
from app.services import cosmetic_service, reward_service
from app.services.cosmetic_service import CosmeticError
from tests.conftest import make_google_user


async def _give_coins(session, user_id: int, coins: int) -> None:
    await reward_service.grant(session, user_id, coins=coins, xp=0, source=RewardSource.LOGIN)
    await session.commit()


async def test_purchase_deducts_and_records(session):
    user = await make_google_user(session, "a@x.com", "alice")
    await _give_coins(session, user.id, 500)

    outcome = await cosmetic_service.purchase(session, user.id, "straw_hat")
    assert outcome.coins == 380  # 500 - 120

    assert await cosmetic_service.list_owned(session, user.id) == ["straw_hat"]

    wallet = await session.get(UserWallet, user.id)
    assert wallet.coins == 380

    ledger = (
        (
            await session.execute(
                select(WalletLedger).where(
                    WalletLedger.user_id == user.id,
                    WalletLedger.source == RewardSource.PURCHASE.value,
                )
            )
        )
        .scalars()
        .all()
    )
    assert len(ledger) == 1 and ledger[0].delta_coins == -120


async def test_purchase_insufficient_coins(session):
    user = await make_google_user(session, "b@x.com", "bob")
    await _give_coins(session, user.id, 50)

    with pytest.raises(CosmeticError):
        await cosmetic_service.purchase(session, user.id, "straw_hat")
    assert await cosmetic_service.list_owned(session, user.id) == []


async def test_purchase_idempotent(session):
    user = await make_google_user(session, "c@x.com", "cara")
    await _give_coins(session, user.id, 500)

    await cosmetic_service.purchase(session, user.id, "straw_hat")
    again = await cosmetic_service.purchase(session, user.id, "straw_hat")

    assert again.coins == 380  # unchanged — no double charge
    wallet = await session.get(UserWallet, user.id)
    assert wallet.coins == 380
    assert await cosmetic_service.list_owned(session, user.id) == ["straw_hat"]


async def test_purchase_unknown_cosmetic(session):
    user = await make_google_user(session, "d@x.com", "dan")
    await _give_coins(session, user.id, 500)

    with pytest.raises(CosmeticError):
        await cosmetic_service.purchase(session, user.id, "jetpack")
