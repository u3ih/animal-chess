"""Daily quests: deterministic per-day assignment + progress (explicit claim grants reward).

Rows are keyed by server-day, so yesterday's quests simply fall out of "today" — an
implicit reset with no cron required. ``claimed_at`` is set-once ⇒ claim is idempotent.
"""

import random
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import server_day, utcnow
from app.enums import QuestKind, RewardSource
from app.events import publish_to_user
from app.models.quest import QuestDefinition, UserDailyQuest
from app.services import reward_service

_QUESTS_PER_DAY = 3


@dataclass(slots=True)
class QuestView:
    row: UserDailyQuest
    definition: QuestDefinition


def _weighted_sample(defs: list[QuestDefinition], k: int, rng: random.Random) -> list[QuestDefinition]:
    pool = list(defs)
    chosen: list[QuestDefinition] = []
    while pool and len(chosen) < k:
        weights = [max(1, d.weight) for d in pool]
        pick = rng.choices(pool, weights=weights, k=1)[0]
        chosen.append(pick)
        pool.remove(pick)
    return chosen


async def _active_defs(session: AsyncSession) -> list[QuestDefinition]:
    stmt = select(QuestDefinition).where(QuestDefinition.is_active == True)  # noqa: E712
    return list((await session.execute(stmt)).scalars().all())


async def _rows_for_day(session: AsyncSession, user_id: int, day: date) -> list[UserDailyQuest]:
    stmt = select(UserDailyQuest).where(UserDailyQuest.user_id == user_id, UserDailyQuest.day == day)
    return list((await session.execute(stmt)).scalars().all())


async def _ensure_assigned(session: AsyncSession, user_id: int, day: date) -> list[UserDailyQuest]:
    rows = await _rows_for_day(session, user_id, day)
    if rows:
        return rows
    defs = await _active_defs(session)
    if not defs:
        return []
    rng = random.Random(user_id * 100_000 + day.toordinal())
    picks = _weighted_sample(defs, _QUESTS_PER_DAY, rng)
    rows = [
        UserDailyQuest(user_id=user_id, day=day, quest_id=d.id, progress=0, target=d.target)
        for d in picks
    ]
    session.add_all(rows)
    await session.flush()
    return rows


async def todays_quests(session: AsyncSession, user_id: int) -> list[QuestView]:
    today = server_day()
    rows = await _ensure_assigned(session, user_id, today)
    await session.commit()
    defs = {d.id: d for d in await _active_defs(session)}
    return [QuestView(row=r, definition=defs[r.quest_id]) for r in rows if r.quest_id in defs]


def _advance(row: UserDailyQuest, value: int) -> None:
    capped = min(row.target, value)
    if capped <= row.progress:
        return
    row.progress = capped
    if row.progress >= row.target and row.completed_at is None:
        row.completed_at = utcnow()


async def _defs_by_id(session: AsyncSession, ids: set[int]) -> dict[int, QuestDefinition]:
    if not ids:
        return {}
    stmt = select(QuestDefinition).where(QuestDefinition.id.in_(ids))
    return {d.id: d for d in (await session.execute(stmt)).scalars().all()}


async def bump(session: AsyncSession, user_id: int, kind: QuestKind, *, amount: int = 1) -> None:
    """Increment today's quests of ``kind`` by ``amount`` (no commit — caller owns the txn)."""
    today = server_day()
    rows = await _ensure_assigned(session, user_id, today)
    defs = await _defs_by_id(session, {r.quest_id for r in rows})
    for row in rows:
        if defs.get(row.quest_id) and defs[row.quest_id].kind == kind.value:
            _advance(row, row.progress + amount)


async def set_streak(session: AsyncSession, user_id: int, value: int) -> None:
    today = server_day()
    rows = await _ensure_assigned(session, user_id, today)
    defs = await _defs_by_id(session, {r.quest_id for r in rows})
    for row in rows:
        if defs.get(row.quest_id) and defs[row.quest_id].kind == QuestKind.WIN_STREAK.value:
            _advance(row, value)


async def bump_capture(session: AsyncSession, user_id: int, captured_kinds: list[str]) -> None:
    if not captured_kinds:
        return
    today = server_day()
    rows = await _ensure_assigned(session, user_id, today)
    defs = await _defs_by_id(session, {r.quest_id for r in rows})
    for row in rows:
        d = defs.get(row.quest_id)
        if not d or d.kind != QuestKind.CAPTURE_PIECE.value:
            continue
        matches = sum(1 for k in captured_kinds if d.piece_kind is None or d.piece_kind == k)
        if matches:
            _advance(row, row.progress + matches)


async def claim_quest(session: AsyncSession, user_id: int, quest_id: int) -> reward_service.RewardOutcome | None:
    today = server_day()
    row = await session.get(UserDailyQuest, (user_id, today, quest_id))
    if row is None or row.completed_at is None or row.claimed_at is not None:
        return None
    definition = await session.get(QuestDefinition, quest_id)
    if definition is None:
        return None
    row.claimed_at = utcnow()
    session.add(row)
    outcome = await reward_service.grant(
        session,
        user_id,
        coins=definition.reward_coins,
        xp=definition.reward_xp,
        source=RewardSource.QUEST,
        ref_id=f"quest:{today.isoformat()}:{quest_id}",
    )
    await session.commit()
    await publish_to_user(
        user_id,
        "wallet",
        {"coins": outcome.total_coins, "xp": outcome.total_xp, "level": outcome.level, "leveledUp": outcome.leveled_up},
    )
    await publish_to_user(
        user_id, "reward", {"source": RewardSource.QUEST.value, "coins": outcome.coins, "xp": outcome.xp}
    )
    return outcome
