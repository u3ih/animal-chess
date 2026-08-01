"""Core identity + the server-authoritative rating/wallet tables."""

from datetime import datetime

from sqlalchemy import CheckConstraint, Column, Index, String, text
from sqlmodel import Field, SQLModel

from app.models.base import created_column, updated_column, utc_column


class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        # Case-insensitive uniqueness without a generated column.
        Index("ux_users_username_ci", text("lower(username)"), unique=True),
        CheckConstraint("(kind = 'google' AND email IS NOT NULL) OR (kind = 'guest')", name="ck_users_kind_email"),
    )

    id: int | None = Field(default=None, primary_key=True)
    kind: str = Field(index=True)  # UserKind value
    email: str | None = Field(default=None, sa_column=Column(String, unique=True, nullable=True))
    # Google `sub` or the guest uuid — lets us resolve either web userId.
    external_id: str | None = Field(default=None, sa_column=Column(String, unique=True, nullable=True))
    username: str
    image_url: str | None = None
    is_active: bool = Field(default=True)
    last_seen_at: datetime | None = Field(default=None, sa_column=utc_column())
    created_at: datetime = Field(default=None, sa_column=created_column())
    updated_at: datetime = Field(default=None, sa_column=updated_column())


class UserRating(SQLModel, table=True):
    """Hidden ELO. Only google users get a row; tier/division are derived, never stored."""

    __tablename__ = "user_rating"
    __table_args__ = (Index("ix_user_rating_elo", "elo"),)

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    elo: int = Field(default=1000)
    games: int = Field(default=0)
    wins: int = Field(default=0)
    losses: int = Field(default=0)
    draws: int = Field(default=0)
    peak_elo: int = Field(default=1000)
    updated_at: datetime = Field(default=None, sa_column=updated_column())


class UserWallet(SQLModel, table=True):
    """Coins / XP / level — server-authoritative. ``level`` is cached for leaderboard sort."""

    __tablename__ = "user_wallet"
    __table_args__ = (
        Index("ix_user_wallet_coins", "coins"),
        Index("ix_user_wallet_level_xp", "level", "xp"),
    )

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    coins: int = Field(default=0)
    xp: int = Field(default=0)
    level: int = Field(default=1)
    updated_at: datetime = Field(default=None, sa_column=updated_column())


class WalletLedger(SQLModel, table=True):
    """Append-only audit of every coin/xp delta — anti-cheat forensics + double-award detection."""

    __tablename__ = "wallet_ledger"
    __table_args__ = (Index("ix_wallet_ledger_user", "user_id", "id"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    delta_coins: int = Field(default=0)
    delta_xp: int = Field(default=0)
    source: str  # RewardSource value
    ref_id: str | None = None
    created_at: datetime = Field(default=None, sa_column=created_column())
