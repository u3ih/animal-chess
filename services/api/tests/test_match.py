from datetime import datetime, timezone

from app.models.user import UserRating, UserWallet
from app.services import match_service
from app.services.match_service import MatchResultInput, PlayerInput
from tests.conftest import make_google_user


def _input(match_id: str, blue_id: str = "b@x.com", captured=None) -> MatchResultInput:
    now = datetime.now(timezone.utc)
    return MatchResultInput(
        match_id=match_id,
        players=[PlayerInput("a@x.com", "red"), PlayerInput(blue_id, "blue")],
        winner="red",
        reason="den",
        moves=12,
        started_at=now,
        ended_at=now,
        captured_kinds=captured or {"red": ["elephant"], "blue": []},
    )


async def test_ranked_match_updates_elo_and_awards(session):
    a = await make_google_user(session, "a@x.com", "alice")
    b = await make_google_user(session, "b@x.com", "bob")

    out = await match_service.report_result(session, _input("M1"))
    assert out.status == "processed" and out.is_ranked

    ra = await session.get(UserRating, a.id)
    rb = await session.get(UserRating, b.id)
    assert ra.elo > 1000 and rb.elo < 1000
    assert ra.wins == 1 and rb.losses == 1 and ra.games == 1

    wa = await session.get(UserWallet, a.id)
    assert wa.coins > 0


async def test_duplicate_report_is_idempotent(session):
    a = await make_google_user(session, "a@x.com", "alice")
    await make_google_user(session, "b@x.com", "bob")

    await match_service.report_result(session, _input("M2"))
    wa = await session.get(UserWallet, a.id)
    coins_after_first = wa.coins
    ra = await session.get(UserRating, a.id)
    elo_after_first = ra.elo

    second = await match_service.report_result(session, _input("M2"))
    assert second.status == "duplicate"

    wa2 = await session.get(UserWallet, a.id)
    ra2 = await session.get(UserRating, a.id)
    assert wa2.coins == coins_after_first
    assert ra2.elo == elo_after_first and ra2.games == 1


async def test_guest_participant_blocks_all_awards(session):
    a = await make_google_user(session, "a@x.com", "alice")

    out = await match_service.report_result(session, _input("G1", blue_id="guest-uuid-123", captured={}))
    assert out.status == "processed" and not out.is_ranked

    ra = await session.get(UserRating, a.id)
    wa = await session.get(UserWallet, a.id)
    assert ra.elo == 1000 and ra.games == 0
    assert wa.coins == 0
