"""Add chat_messages, document_reviews, clause_reviews, clause_sources tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── chat_messages ──────────────────────────────────────────────────────────
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Enum("user", "model", name="chatrole"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_chat_messages_document_id", "chat_messages", ["document_id"])
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])
    op.create_index("ix_chat_messages_created_at", "chat_messages", ["created_at"])

    # ── document_reviews ───────────────────────────────────────────────────────
    op.create_table(
        "document_reviews",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("total_clauses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("likely_unenforceable_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("needs_review_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("compliant_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("informational_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("review_status", sa.Enum("pending", "processing", "completed", "failed", name="reviewstatus"), nullable=False, server_default="pending"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_document_reviews_document_id", "document_reviews", ["document_id"])

    # ── clause_reviews ─────────────────────────────────────────────────────────
    op.create_table(
        "clause_reviews",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("review_id", sa.String(36), sa.ForeignKey("document_reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clause_number", sa.Integer, nullable=False),
        sa.Column("clause_title", sa.String(512), nullable=False),
        sa.Column("clause_text", sa.Text, nullable=False),
        sa.Column("risk_level", sa.Enum("likely_unenforceable", "needs_review", "compliant", "informational", name="risklevel"), nullable=False),
        sa.Column("color_code", sa.String(7), nullable=False, server_default="#6B7280"),
        sa.Column("plain_english", sa.Text, nullable=True),
        sa.Column("flagging_reason", sa.Text, nullable=True),
        sa.Column("suggested_steps", sa.Text, nullable=True, comment="JSON array of suggested next steps"),
        sa.Column("is_reviewed", sa.Boolean, nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_clause_reviews_review_id", "clause_reviews", ["review_id"])

    # ── clause_sources ─────────────────────────────────────────────────────────
    op.create_table(
        "clause_sources",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("clause_review_id", sa.String(36), sa.ForeignKey("clause_reviews.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.Enum("legislation", "rtb_guidance", "case_law", "other", name="sourcetype"), nullable=False),
        sa.Column("source_name", sa.String(512), nullable=False),
        sa.Column("act_name", sa.String(512), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("link", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_clause_sources_clause_review_id", "clause_sources", ["clause_review_id"])


def downgrade() -> None:
    op.drop_table("clause_sources")
    op.drop_table("clause_reviews")
    op.drop_table("document_reviews")
    op.drop_table("chat_messages")

    # Clean up ENUMs (MySQL ignores this but good practice)
    op.execute("DROP TYPE IF EXISTS chatrole")
    op.execute("DROP TYPE IF EXISTS reviewstatus")
    op.execute("DROP TYPE IF EXISTS risklevel")
    op.execute("DROP TYPE IF EXISTS sourcetype")
