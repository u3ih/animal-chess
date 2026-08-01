"""Baseline schema — created directly from the SQLModel metadata.

Subsequent changes should use ``alembic revision --autogenerate``.

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-20
"""

from alembic import op
from sqlmodel import SQLModel

import app.models  # noqa: F401 — registers every table on SQLModel.metadata

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    SQLModel.metadata.create_all(op.get_bind())


def downgrade() -> None:
    SQLModel.metadata.drop_all(op.get_bind())
