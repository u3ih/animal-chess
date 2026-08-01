"""direct_messages — private chat between friends.

Revision ID: 0003_direct_messages
Revises: 0002_user_cosmetic
Create Date: 2026-07-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0003_direct_messages"
down_revision = "0002_user_cosmetic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender_id", sa.Integer(), nullable=False),
        sa.Column("recipient_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("sender_id <> recipient_id", name="ck_direct_messages_distinct"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dm_sender_recipient", "direct_messages", ["sender_id", "recipient_id", "id"])
    op.create_index("ix_dm_recipient_sender", "direct_messages", ["recipient_id", "sender_id", "id"])
    op.create_index(
        "ix_dm_unread",
        "direct_messages",
        ["recipient_id"],
        postgresql_where=sa.text("read_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_dm_unread", table_name="direct_messages")
    op.drop_index("ix_dm_recipient_sender", table_name="direct_messages")
    op.drop_index("ix_dm_sender_recipient", table_name="direct_messages")
    op.drop_table("direct_messages")
