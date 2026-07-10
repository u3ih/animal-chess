"""user_cosmetic — cosmetic ownership.

Revision ID: 0002_user_cosmetic
Revises: 0001_initial
Create Date: 2026-07-04
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_user_cosmetic"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_cosmetic",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("cosmetic_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "cosmetic_id"),
    )


def downgrade() -> None:
    op.drop_table("user_cosmetic")
