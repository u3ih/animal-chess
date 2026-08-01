"""Match history. ``matches.external_id`` is the webhook idempotency key."""

from datetime import datetime

from sqlalchemy import Column, Index, String
from sqlmodel import Field, SQLModel

from app.models.base import created_column, utc_column


class Match(SQLModel, table=True):
    __tablename__ = "matches"

    id: int | None = Field(default=None, primary_key=True)
    # == webhook matchId. UNIQUE ⇒ exactly-once processing of reportMatchResult.
    external_id: str = Field(sa_column=Column(String, unique=True, nullable=False))
    winner_color: str | None = None  # MatchColor value; NULL = draw
    reason: str | None = None  # MatchReason value
    moves: int = Field(default=0)
    is_ranked: bool = Field(default=False)
    started_at: datetime = Field(sa_column=utc_column(nullable=False))
    ended_at: datetime = Field(sa_column=utc_column(nullable=False))
    created_at: datetime = Field(default=None, sa_column=created_column())


class MatchPlayer(SQLModel, table=True):
    __tablename__ = "match_players"
    __table_args__ = (Index("ix_match_players_user", "user_id", "match_id"),)

    match_id: int = Field(foreign_key="matches.id", primary_key=True, ondelete="CASCADE")
    user_id: int = Field(foreign_key="users.id", primary_key=True)
    color: str  # MatchColor value
    result: str  # MatchResult value (server-authoritative)
    elo_before: int | None = None
    elo_after: int | None = None
    coins_awarded: int = Field(default=0)
    xp_awarded: int = Field(default=0)
