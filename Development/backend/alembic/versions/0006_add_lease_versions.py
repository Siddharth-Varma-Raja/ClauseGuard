"""Add lease version columns to documents table

An updated lease from the landlord is stored as a new document linked to
version 1 of the same lease.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("documents")}
    if "lease_group_id" not in existing:
        op.add_column("documents", sa.Column("lease_group_id", sa.String(36), nullable=True))
        op.create_index("ix_documents_lease_group_id", "documents", ["lease_group_id"])
    if "version" not in existing:
        op.add_column("documents", sa.Column("version", sa.Integer, nullable=False, server_default="1"))


def downgrade() -> None:
    existing = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("documents")}
    if "version" in existing:
        op.drop_column("documents", "version")
    if "lease_group_id" in existing:
        op.drop_index("ix_documents_lease_group_id", table_name="documents")
        op.drop_column("documents", "lease_group_id")
