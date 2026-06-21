"""Achievement definitions + per-user unlocks (PK pair ⇒ unlock is idempotent)."""

from datetime import datetime

from sqlalchemy import Column, String
from sqlmodel import Field, SQLModel

from app.models.base import created_column


class AchievementDefinition(SQLModel, table=True):
    __tablename__ = "achievement_definition"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(sa_column=Column(String, unique=True, nullable=False))  # maps to an i18n key on the web
    reward_coins: int = Field(default=0)
    reward_xp: int = Field(default=0)
    is_secret: bool = Field(default=False)


class UserAchievement(SQLModel, table=True):
    __tablename__ = "user_achievement"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    achievement_id: int = Field(foreign_key="achievement_definition.id", primary_key=True)
    unlocked_at: datetime = Field(default=None, sa_column=created_column())
