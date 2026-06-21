"""Daily quest definitions + per-user, per-day progress (day-keyed ⇒ implicit reset)."""

from datetime import date, datetime

from sqlalchemy import Column, Index, String
from sqlmodel import Field, SQLModel

from app.models.base import utc_column


class QuestDefinition(SQLModel, table=True):
    __tablename__ = "quest_definition"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(sa_column=Column(String, unique=True, nullable=False))  # maps to an i18n key on the web
    kind: str  # QuestKind value
    target: int
    piece_kind: str | None = None  # only for capture_piece quests
    reward_coins: int
    reward_xp: int
    weight: int = Field(default=1)  # selection weight for the daily roll
    is_active: bool = Field(default=True)


class UserDailyQuest(SQLModel, table=True):
    __tablename__ = "user_daily_quest"
    __table_args__ = (Index("ix_user_daily_quest_day", "user_id", "day"),)

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    day: date = Field(primary_key=True)
    quest_id: int = Field(foreign_key="quest_definition.id", primary_key=True)
    progress: int = Field(default=0)
    target: int  # copied at assignment ⇒ immutable for the day
    completed_at: datetime | None = Field(default=None, sa_column=utc_column())
    claimed_at: datetime | None = Field(default=None, sa_column=utc_column())  # set-once ⇒ idempotent claim
