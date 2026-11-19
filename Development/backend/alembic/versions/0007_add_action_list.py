"""Add action_list column to document_reviews

Stores the rule-based action list (JSON text) built when a lease is analysed.

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("document_reviews")}
    if "action_list" not in existing:
        op.add_column("document_reviews", sa.Column("action_list", sa.Text, nullable=True))


def downgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("document_reviews")}
    if "action_list" in existing:
        op.drop_column("document_reviews", "action_list")
