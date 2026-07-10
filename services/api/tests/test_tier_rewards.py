"""Tier promotion rewards inside the match-report funnel."""

from datetime import datetime, timezone

from sqlalchemy import select

from app.enums import RewardSource, Tier
from app.gamification import TIER_PROMOTION_REWARDS
from app.models.user import UserRating, UserWallet, WalletLedger
from app.services import match_service
from app.services.match_service import MatchResultInput, PlayerInput
from tests.conftest import make_google_user


def _input(match_id: str) -> MatchResultInput:
    now = datetime.now(timezone.utc)
    return MatchResultInput(
        match_id=match_id,
        players=[PlayerInput("a@x.com", "red"), PlayerInput("b@x.com", "blue")],
        winner="red",
        reason="den",
        moves=12,
        started_at=now,
        ended_at=now,
        captured_kinds={"red": [], "blue": []},
    )


async def _tier_ledger_rows(session, user_id):
    stmt = select(WalletLedger).where(
        WalletLedger.user_id == user_id, WalletLedger.source == RewardSource.TIER_UP.value
    )
    return list((await session.execute(stmt)).scalars().all())


async def test_promotion_grants_once_when_peak_crosses_floor(session):
    a = await make_google_user(session, "a@x.com", "alice")
    await make_google_user(session, "b@x.com", "bob")

    # Winner sits just under the Silver floor; a provisional win (+~20) crosses it.
    rating = await session.get(UserRating, a.id)
    rating.elo = 1095
    rating.peak_elo = 1095
    session.add(rating)
    await session.commit()

    await match_service.report_result(session, _input("T1"))

    rows = await _tier_ledger_rows(session, a.id)
    silver_coins, silver_xp = TIER_PROMOTION_REWARDS[Tier.SILVER]
    assert [(r.delta_coins, r.delta_xp, r.ref_id) for r in rows] == [(silver_coins, silver_xp, "tier:silver")]


async def test_no_second_grant_after_dropping_and_reclimbing(session):
    a = await make_google_user(session, "a@x.com", "alice")
    await make_google_user(session, "b@x.com", "bob")

    rating = await session.get(UserRating, a.id)
    rating.elo = 1095
    rating.peak_elo = 1095
    session.add(rating)
    await session.commit()

    await match_service.report_result(session, _input("T2"))
    assert len(await _tier_ledger_rows(session, a.id)) == 1

    # Simulate falling back below Silver, then winning again: peak never re-crosses ⇒ no double pay.
    rating = await session.get(UserRating, a.id)
    rating.elo = 1080
    session.add(rating)
    await session.commit()

    await match_service.report_result(session, _input("T3"))
    assert len(await _tier_ledger_rows(session, a.id)) == 1


async def test_loser_gets_no_promotion(session):
    await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")

    rating = await session.get(UserRating, b.id)
    rating.elo = 1099
    rating.peak_elo = 1099
    session.add(rating)
    await session.commit()

    await match_service.report_result(session, _input("T4"))  # red (alice) wins
    assert await _tier_ledger_rows(session, b.id) == []

    wallet = await session.get(UserWallet, b.id)
    assert wallet.coins == 5  # loss consolation only
