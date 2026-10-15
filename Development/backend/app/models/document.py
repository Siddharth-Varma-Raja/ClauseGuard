"""
Document Model
================
Stores metadata about uploaded PDF documents in MySQL.

The actual file content lives in S3 — this table tracks ownership,
processing status, S3 location, and supports soft-deletion for
audit / GDPR compliance.
"""

import enum
import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DocumentStatus(str, enum.Enum):
    """Pipeline lifecycle states."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base):
    __tablename__ = "documents"

    # ── Primary key ────────────────────────────────────────────────────────────
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # ── Ownership ──────────────────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # ── File metadata ─────────────────────────────────────────────────────────
    original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(
        String(128), nullable=False, default="application/pdf"
    )
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True,
        comment="SHA-256 hex digest of the original uploaded file bytes",
    )

    # ── S3 location ───────────────────────────────────────────────────────────
    s3_key: Mapped[str | None] = mapped_column(String(1024))
    s3_uri: Mapped[str | None] = mapped_column(String(1024))

    # ── Pipeline state ────────────────────────────────────────────────────────
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=DocumentStatus.PENDING,
    )
    char_count: Mapped[int | None] = mapped_column(
        BigInteger,
        comment="Character count of the redacted text stored in S3",
    )
    pipeline_error: Mapped[str | None] = mapped_column(
        Text, comment="Error message if the pipeline failed",
    )

    # ── Soft-delete ───────────────────────────────────────────────────────────
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    owner = relationship("User", back_populates="documents", lazy="selectin")

    # ── Table-level indexes ───────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_documents_user_id", "user_id"),
        Index("ix_documents_status", "status"),
        Index("ix_documents_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<Document id={self.id!r} file={self.original_filename!r} "
            f"status={self.status.value!r}>"
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def compute_hash(data: bytes) -> str:
        """Return the SHA-256 hex digest of *data*."""
        return hashlib.sha256(data).hexdigest()
