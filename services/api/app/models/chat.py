"""Private (friend-to-friend) direct messages."""

from datetime import datetime

from sqlalchemy import CheckConstraint, Index, text
from sqlmodel import Field, SQLModel

from app.models.base import created_column, utc_column


class DirectMessage(SQLModel, table=True):
    __tablename__ = "direct_messages"
    __table_args__ = (
        CheckConstraint("sender_id <> recipient_id", name="ck_direct_messages_distinct"),
        # Thread reads scan both directions of a pair; one index per direction covers each OR arm.
        Index("ix_dm_sender_recipient", "sender_id", "recipient_id", "id"),
        Index("ix_dm_recipient_sender", "recipient_id", "sender_id", "id"),
        Index("ix_dm_unread", "recipient_id", postgresql_where=text("read_at IS NULL")),
    )

    id: int | None = Field(default=None, primary_key=True)
    sender_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    recipient_id: int = Field(foreign_key="users.id", ondelete="CASCADE")
    body: str
    created_at: datetime = Field(default=None, sa_column=created_column())
    read_at: datetime | None = Field(default=None, sa_column=utc_column())
