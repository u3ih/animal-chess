from datetime import timedelta

from app.core.time import server_day
from app.models.gamification import LoginStreak
from app.models.user import UserWallet
from app.services import login_service
from tests.conftest import make_google_user


async def test_claim_once_per_day(session):
    user = await make_google_user(session, "a@x.com", "alice")
    first = await login_service.claim_daily(session, user.id)
    assert first.claimed and first.coins > 0

    again = await login_service.claim_daily(session, user.id)
    assert not again.claimed and again.coins == 0

    wallet = await session.get(UserWallet, user.id)
    assert wallet.coins == first.coins  # not double-awarded


async def test_streak_increments_on_consecutive_day(session):
    user = await make_google_user(session, "b@x.com", "bob")
    streak = await session.get(LoginStreak, user.id)
    streak.last_claim_day = server_day() - timedelta(days=1)
    streak.current_streak = 1
    session.add(streak)
    await session.commit()

    result = await login_service.claim_daily(session, user.id)
    assert result.claimed and result.streak == 2


async def test_streak_resets_after_gap(session):
    user = await make_google_user(session, "c@x.com", "cara")
    streak = await session.get(LoginStreak, user.id)
    streak.last_claim_day = server_day() - timedelta(days=3)
    streak.current_streak = 5
    session.add(streak)
    await session.commit()

    result = await login_service.claim_daily(session, user.id)
    assert result.claimed and result.streak == 1
