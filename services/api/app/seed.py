"""Seed quest + achievement definitions. Idempotent. Run: ``python -m app.seed``."""

import asyncio

from sqlalchemy import select

from app.db import async_session_factory
from app.enums import QuestKind
from app.models.achievement import AchievementDefinition
from app.models.quest import QuestDefinition

QUESTS = [
    dict(code="WIN_1", kind=QuestKind.WIN_GAMES.value, target=1, reward_coins=60, reward_xp=40, weight=3),
    dict(code="WIN_3", kind=QuestKind.WIN_GAMES.value, target=3, reward_coins=140, reward_xp=90, weight=1),
    dict(code="PLAY_3", kind=QuestKind.PLAY_GAMES.value, target=3, reward_coins=60, reward_xp=40, weight=3),
    dict(code="PLAY_5", kind=QuestKind.PLAY_GAMES.value, target=5, reward_coins=110, reward_xp=70, weight=1),
    dict(code="STREAK_2", kind=QuestKind.WIN_STREAK.value, target=2, reward_coins=90, reward_xp=60, weight=2),
    dict(
        code="CAPTURE_ELEPHANT",
        kind=QuestKind.CAPTURE_PIECE.value,
        target=1,
        piece_kind="elephant",
        reward_coins=100,
        reward_xp=60,
        weight=2,
    ),
    dict(
        code="CAPTURE_ANY_3",
        kind=QuestKind.CAPTURE_PIECE.value,
        target=3,
        piece_kind=None,
        reward_coins=70,
        reward_xp=40,
        weight=2,
    ),
    dict(code="LOGIN_1", kind=QuestKind.LOGIN.value, target=1, reward_coins=30, reward_xp=20, weight=1),
]

ACHIEVEMENTS = [
    dict(code="FIRST_WIN", reward_coins=100, reward_xp=50),
    dict(code="WIN_STREAK_5", reward_coins=200, reward_xp=100),
    dict(code="DEN_RAIDER", reward_coins=80, reward_xp=40),
    dict(code="ELEPHANT_HUNTER", reward_coins=120, reward_xp=60),
    dict(code="REACH_GOLD", reward_coins=300, reward_xp=150),
    dict(code="REACH_DIAMOND", reward_coins=1000, reward_xp=500, is_secret=True),
    dict(code="REACH_MASTER", reward_coins=2000, reward_xp=1000, is_secret=True),
    dict(code="REACH_GRANDMASTER", reward_coins=4000, reward_xp=2000, is_secret=True),
]


async def seed() -> None:
    async with async_session_factory() as session:
        existing_quests = set((await session.execute(select(QuestDefinition.code))).scalars().all())
        for q in QUESTS:
            if q["code"] not in existing_quests:
                session.add(QuestDefinition(**q))
        existing_ach = set((await session.execute(select(AchievementDefinition.code))).scalars().all())
        for a in ACHIEVEMENTS:
            if a["code"] not in existing_ach:
                session.add(AchievementDefinition(**a))
        await session.commit()
    print(f"seeded {len(QUESTS)} quests, {len(ACHIEVEMENTS)} achievements (idempotent)")


if __name__ == "__main__":
    asyncio.run(seed())
