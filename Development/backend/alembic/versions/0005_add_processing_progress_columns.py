"""Add processing progress columns to documents table

These four columns allow the background worker thread to write its progress
directly into MySQL, so the SSE generator can poll the DB instead of relying
on in-memory state (which is lost on worker restart and doesn't work across
multiple processes).

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-04
"""

from alembic import op
import sqlalchemy as sa

# ── Alembic revision chain ─────────────────────────────────────────────────────
revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # processing_step  — human-readable pipeline stage name:
    #   "uploaded" | "extracting" | "validating" | "redacting" | "analysing"
    #   | "completed" | "failed"
    op.add_column(
        "documents",
        sa.Column("processing_step", sa.String(50), nullable=True),
    )

    # processing_step_index — 0-based index of the current step out of total
    #   steps, used by the frontend progress bar (0 = uploaded, 4 = analysing)
    op.add_column(
        "documents",
        sa.Column("processing_step_index", sa.Integer, nullable=True),
    )

    # processing_progress — float 0.0–1.0, overall fraction of work done
    op.add_column(
        "documents",
        sa.Column("processing_progress", sa.Float, nullable=True),
    )

    # processing_message — the display message shown to the user, e.g.
    #   "Analysing clauses against Irish tenancy law…"
    op.add_column(
        "documents",
        sa.Column("processing_message", sa.Text, nullable=True),
    )

    # estimated_seconds — initial estimate written at upload time by estimator.py
    op.add_column(
        "documents",
        sa.Column("estimated_seconds", sa.Integer, nullable=True),
    )

    # page_count — extracted from the PDF at upload time for display + timing
    op.add_column(
        "documents",
        sa.Column("page_count", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("documents", "page_count")
    op.drop_column("documents", "estimated_seconds")
    op.drop_column("documents", "processing_message")
    op.drop_column("documents", "processing_progress")
    op.drop_column("documents", "processing_step_index")
    op.drop_column("documents", "processing_step")

