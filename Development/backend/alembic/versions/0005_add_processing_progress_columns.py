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
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_cols = {c["name"] for c in insp.get_columns("documents")}

    cols = [
        ("processing_step", sa.Column("processing_step", sa.String(50), nullable=True)),
        ("processing_step_index", sa.Column("processing_step_index", sa.Integer, nullable=True)),
        ("processing_progress", sa.Column("processing_progress", sa.Float, nullable=True)),
        ("processing_message", sa.Column("processing_message", sa.Text, nullable=True)),
        ("estimated_seconds", sa.Column("estimated_seconds", sa.Integer, nullable=True)),
        ("page_count", sa.Column("page_count", sa.Integer, nullable=True)),
    ]
    for col_name, col_obj in cols:
        if col_name not in existing_cols:
            op.add_column("documents", col_obj)


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_cols = {c["name"] for c in insp.get_columns("documents")}

    cols = [
        "page_count",
        "estimated_seconds",
        "processing_message",
        "processing_progress",
        "processing_step_index",
        "processing_step",
    ]
    for col_name in cols:
        if col_name in existing_cols:
            op.drop_column("documents", col_name)

