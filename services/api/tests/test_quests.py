from app.enums import QuestKind
from app.models.quest import QuestDefinition
from app.models.user import UserWallet
from app.services import quest_service
from tests.conftest import make_google_user


async def _seed_win_quest(session):
    session.add(
        QuestDefinition(code="WIN_1", kind=QuestKind.WIN_GAMES.value, target=1, reward_coins=60, reward_xp=40, weight=1)
    )
    await session.commit()


async def test_assign_progress_and_claim(session):
    user = await make_google_user(session, "a@x.com", "alice")
    await _seed_win_quest(session)

    views = await quest_service.todays_quests(session, user.id)
    assert len(views) == 1 and views[0].definition.code == "WIN_1"
    assert not views[0].row.completed_at

    await quest_service.bump(session, user.id, QuestKind.WIN_GAMES)
    await session.commit()

    views = await quest_service.todays_quests(session, user.id)
    assert views[0].row.completed_at is not None
    quest_id = views[0].row.quest_id

    outcome = await quest_service.claim_quest(session, user.id, quest_id)
    assert outcome is not None and outcome.coins == 60

    wallet = await session.get(UserWallet, user.id)
    assert wallet.coins == 60

    # Second claim is rejected (idempotent).
    assert await quest_service.claim_quest(session, user.id, quest_id) is None
    wallet2 = await session.get(UserWallet, user.id)
    assert wallet2.coins == 60
