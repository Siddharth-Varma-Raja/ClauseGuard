"""
Document Review Models
========================
Stores the ML model's clause-by-clause analysis of a lease document.

Tables:
  - document_reviews  : One per document — overall summary and review status
  - clause_reviews    : One per flagged clause — risk level, explanation, etc.
  - clause_sources    : Legal sources cited for each clause (1-to-many)
"""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────


class ReviewStatus(str, enum.Enum):
    """Overall review pipeline status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RiskLevel(str, enum.Enum):
    """Risk classification for each clause."""
    LIKELY_UNENFORCEABLE = "likely_unenforceable"
    NEEDS_REVIEW = "needs_review"
    COMPLIANT = "compliant"
    INFORMATIONAL = "informational"


class SourceType(str, enum.Enum):
    """Category of the legal source."""
    LEGISLATION = "legislation"
    RTB_GUIDANCE = "rtb_guidance"
    CASE_LAW = "case_law"
    OTHER = "other"


# ── Risk level → colour mapping ───────────────────────────────────────────────
RISK_COLOR_MAP = {
    RiskLevel.LIKELY_UNENFORCEABLE: "red",
    RiskLevel.NEEDS_REVIEW: "amber",
    RiskLevel.COMPLIANT: "green",
    RiskLevel.INFORMATIONAL: "grey",
}


# ── Document Review (one per document) ─────────────────────────────────────────


class DocumentReview(Base):
    __tablename__ = "document_reviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )

    # ── Summary counts ─────────────────────────────────────────────────────────
    total_clauses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    likely_unenforceable_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    needs_review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    compliant_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    informational_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Extra analysis metadata ────────────────────────────────────────────────
    property_address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    monthly_rent_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deposit_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tenancy_start: Mapped[str | None] = mapped_column(String(64), nullable=True)
    term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # ── Review status ──────────────────────────────────────────────────────────
    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=ReviewStatus.PENDING,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    clauses = relationship(
        "ClauseReview", back_populates="review",
        cascade="all, delete-orphan", lazy="selectin",
        order_by="ClauseReview.clause_number",
    )

    __table_args__ = (
        Index("ix_document_reviews_document_id", "document_id"),
    )

    def __repr__(self) -> str:
        return f"<DocumentReview doc={self.document_id!r} status={self.review_status.value!r}>"


# ── Clause Review (one per clause within a document review) ────────────────────


class ClauseReview(Base):
    __tablename__ = "clause_reviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    review_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("document_reviews.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Clause identification ──────────────────────────────────────────────────
    clause_number: Mapped[int] = mapped_column(Integer, nullable=False)
    clause_title: Mapped[str] = mapped_column(String(512), nullable=False)
    clause_text: Mapped[Text] = mapped_column(Text, nullable=False)
    page: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    confidence: Mapped[str] = mapped_column(String(32), nullable=False, default="high")

    # ── Risk assessment ────────────────────────────────────────────────────────
    risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    color_code: Mapped[str] = mapped_column(
        String(16), nullable=False, default="grey",
        comment="Colour label for the risk level (red, amber, green, grey)",
    )

    # ── AI-generated explanations ──────────────────────────────────────────────
    plain_english: Mapped[str | None] = mapped_column(
        Text, comment="Plain-English explanation of this clause",
    )
    flagging_reason: Mapped[str | None] = mapped_column(
        Text, comment="Why ClauseGuard flagged this clause",
    )
    suggested_steps: Mapped[str | None] = mapped_column(
        Text, comment="JSON array of suggested next steps",
    )

    # ── Review state ───────────────────────────────────────────────────────────
    is_reviewed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    review = relationship("DocumentReview", back_populates="clauses")
    sources = relationship(
        "ClauseSource", back_populates="clause",
        cascade="all, delete-orphan", lazy="selectin",
    )

    __table_args__ = (
        Index("ix_clause_reviews_review_id", "review_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ClauseReview clause={self.clause_number} "
            f"title={self.clause_title!r} risk={self.risk_level.value!r}>"
        )


# ── Clause Source (legal references for a clause) ──────────────────────────────


class ClauseSource(Base):
    __tablename__ = "clause_sources"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    clause_review_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clause_reviews.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Source details ─────────────────────────────────────────────────────────
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    source_name: Mapped[str] = mapped_column(String(512), nullable=False)
    act_name: Mapped[str | None] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(
        String(1024), comment="URL to the full act or guidance document",
    )

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    clause = relationship("ClauseReview", back_populates="sources")

    __table_args__ = (
        Index("ix_clause_sources_clause_review_id", "clause_review_id"),
    )

    def __repr__(self) -> str:
        return f"<ClauseSource name={self.source_name!r} type={self.source_type.value!r}>"