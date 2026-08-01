"""Cosmetic ownership — which costumes a google user has purchased.

Equipped state lives client-side (localStorage) so it works offline / for guests / on the static
export; only *ownership* is server-authoritative, gated behind a coin purchase.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.base import created_column


class UserCosmetic(SQLModel, table=True):
    """One row per (user, cosmetic) the user owns. Composite PK makes purchases idempotent."""

    __tablename__ = "user_cosmetic"

    user_id: int = Field(foreign_key="users.id", primary_key=True, ondelete="CASCADE")
    cosmetic_id: str = Field(primary_key=True)
    created_at: datetime = Field(default=None, sa_column=created_column())
