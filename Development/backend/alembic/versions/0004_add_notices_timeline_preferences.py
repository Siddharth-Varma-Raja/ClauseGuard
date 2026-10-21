"""Add notices, timeline_events, user_preferences and analysis fields

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── notices ───────────────────────────────────────────────────────────────
    op.create_table(
        "notices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("notice_type", sa.String(32), nullable=False),
        sa.Column("verdict", sa.String(32), nullable=False),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("checks_json", sa.Text, nullable=False),
        sa.Column("key_dates_json", sa.Text, nullable=False),
        sa.Column("next_steps_json", sa.Text, nullable=False),
        sa.Column("answers_json", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notices_user_id", "notices", ["user_id"])
    op.create_index("ix_notices_created_at", "notices", ["created_at"])

    # ── timeline_events ───────────────────────────────────────────────────────
    op.create_table(
        "timeline_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("event_date", sa.String(64), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False, server_default="event"),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column("done", sa.Boolean, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_timeline_events_user_id", "timeline_events", ["user_id"])
    op.create_index("ix_timeline_events_created_at", "timeline_events", ["created_at"])

    # ── user_preferences ──────────────────────────────────────────────────────
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("explanation_detail", sa.String(32), nullable=False, server_default="simple"),
        sa.Column("reminders_enabled", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"])

    # ── New fields on document_reviews ────────────────────────────────────────
    op.add_column("document_reviews", sa.Column("property_address", sa.String(512), nullable=True))
    op.add_column("document_reviews", sa.Column("monthly_rent_cents", sa.Integer, nullable=True))
    op.add_column("document_reviews", sa.Column("deposit_cents", sa.Integer, nullable=True))
    op.add_column("document_reviews", sa.Column("tenancy_start", sa.String(64), nullable=True))
    op.add_column("document_reviews", sa.Column("term_months", sa.Integer, nullable=True))
    op.add_column("document_reviews", sa.Column("page_count", sa.Integer, nullable=False, server_default="1"))

    # ── New fields on clause_reviews ──────────────────────────────────────────
    op.add_column("clause_reviews", sa.Column("page", sa.Integer, nullable=False, server_default="1"))
    op.add_column("clause_reviews", sa.Column("confidence", sa.String(32), nullable=False, server_default="high"))


def downgrade() -> None:
    op.drop_column("clause_reviews", "confidence")
    op.drop_column("clause_reviews", "page")
    op.drop_column("document_reviews", "page_count")
    op.drop_column("document_reviews", "term_months")
    op.drop_column("document_reviews", "tenancy_start")
    op.drop_column("document_reviews", "deposit_cents")
    op.drop_column("document_reviews", "monthly_rent_cents")
    op.drop_column("document_reviews", "property_address")
    op.drop_table("user_preferences")
    op.drop_table("timeline_events")
    op.drop_table("notices")
