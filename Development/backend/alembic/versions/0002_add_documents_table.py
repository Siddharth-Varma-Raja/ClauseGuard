"""Add documents table

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # ── File metadata ─────────────────────────────────────────────
        sa.Column("original_filename", sa.String(512), nullable=False),
        sa.Column(
            "content_type", sa.String(128), nullable=False, server_default="application/pdf"
        ),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=False),
        sa.Column(
            "sha256_hash",
            sa.String(64),
            nullable=False,
            comment="SHA-256 hex digest of the original uploaded file bytes",
        ),
        # ── S3 location ───────────────────────────────────────────────
        sa.Column("s3_key", sa.String(1024), nullable=True),
        sa.Column("s3_uri", sa.String(1024), nullable=True),
        # ── Pipeline state ────────────────────────────────────────────
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "completed", "failed", name="documentstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "char_count",
            sa.BigInteger,
            nullable=True,
            comment="Character count of the redacted text stored in S3",
        ),
        sa.Column(
            "pipeline_error",
            sa.Text,
            nullable=True,
            comment="Error message if the pipeline failed",
        ),
        # ── Soft-delete ───────────────────────────────────────────────
        sa.Column("is_deleted", sa.Boolean, nullable=False, server_default="0"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        # ── Timestamps ────────────────────────────────────────────────
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # ── Indexes ───────────────────────────────────────────────────────
    op.create_index("ix_documents_user_id", "documents", ["user_id"])
    op.create_index("ix_documents_sha256_hash", "documents", ["sha256_hash"])
    op.create_index("ix_documents_status", "documents", ["status"])
    op.create_index("ix_documents_created_at", "documents", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_documents_created_at", "documents")
    op.drop_index("ix_documents_status", "documents")
    op.drop_index("ix_documents_sha256_hash", "documents")
    op.drop_index("ix_documents_user_id", "documents")
    op.drop_table("documents")
