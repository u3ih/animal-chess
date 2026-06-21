"""Login/win streaks + idempotent daily-login claim log."""

from datetime import date, datetime

from sqlmodel import Field, SQLModel

from app.models.base import created_column, updated_column


class LoginStreak(SQLModel, table=True):
    __tablename__ = "login_streak"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_claim_day: date | None = None  # server-day of last claim
    updated_at: datetime = Field(default=None, sa_column=updated_column())


class DailyLoginLog(SQLModel, table=True):
    """One row per claimed server-day ⇒ the daily bonus is idempotent."""

    __tablename__ = "daily_login_log"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    day: date = Field(primary_key=True)
    streak_day: int
    coins: int
    xp: int
    created_at: datetime = Field(default=None, sa_column=created_column())


class WinStreak(SQLModel, table=True):
    __tablename__ = "win_streak"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    current: int = Field(default=0)  # reset to 0 on loss/draw, +1 on ranked win
    longest: int = Field(default=0)
    updated_at: datetime = Field(default=None, sa_column=updated_column())
