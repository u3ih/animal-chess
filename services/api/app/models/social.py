"""Friendships + friend requests (persistent; replace the old in-memory Node model)."""

from datetime import datetime

from sqlalchemy import CheckConstraint, Index, text
from sqlmodel import Field, SQLModel

from app.models.base import created_column, utc_column


class Friendship(SQLModel, table=True):
    """One canonical row per relationship (user_low_id < user_high_id) — no (a,b)/(b,a) dupes."""

    __tablename__ = "friendships"
    __table_args__ = (
        CheckConstraint("user_low_id < user_high_id", name="ck_friendships_order"),
        Index("ix_friendships_high", "user_high_id"),
    )

    user_low_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    user_high_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    created_at: datetime = Field(default=None, sa_column=created_column())


class FriendRequest(SQLModel, table=True):
    __tablename__ = "friend_requests"
    __table_args__ = (
        CheckConstraint("from_user_id <> to_user_id", name="ck_friend_requests_distinct"),
        # At most one pending request per direction.
        Index(
            "ux_friend_requests_pending",
            "from_user_id",
            "to_user_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
        Index(
            "ix_friend_requests_to_pending",
            "to_user_id",
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: int | None = Field(default=None, primary_key=True)
    from_user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    to_user_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    status: str = Field(default="pending")  # FriendRequestStatus value
    created_at: datetime = Field(default=None, sa_column=created_column())
    resolved_at: datetime | None = Field(default=None, sa_column=utc_column())
