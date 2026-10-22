"""
Document Review Pydantic Schemas
===================================
Request / response models for the Document Review (docreview) API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.review import ReviewStatus, RiskLevel, SourceType


# ── Source schemas ─────────────────────────────────────────────────────────────


class ClauseSourceCreate(BaseModel):
    source_type: SourceType
    source_name: str
    act_name: str | None = None
    description: str | None = None
    link: str | None = None


class ClauseSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_type: SourceType
    source_name: str
    act_name: str | None
    description: str | None
    link: str | None


# ── Clause schemas ─────────────────────────────────────────────────────────────


class ClauseReviewCreate(BaseModel):
    clause_number: int
    clause_title: str
    clause_text: str
    risk_level: RiskLevel
    color_code: str = "#6B7280"
    plain_english: str | None = None
    flagging_reason: str | None = None
    suggested_steps: list[str] | None = None
    sources: list[ClauseSourceCreate] = []


class ClauseReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    clause_number: int
    clause_title: str
    clause_text: str
    risk_level: RiskLevel
    color_code: str
    plain_english: str | None
    flagging_reason: str | None
    suggested_steps: list[str] | None
    is_reviewed: bool
    sources: list[ClauseSourceResponse]
    created_at: datetime
    updated_at: datetime


# ── Document Review schemas ────────────────────────────────────────────────────


class DocumentReviewCreate(BaseModel):
    """Payload sent by the ML pipeline after analysing a document."""
    document_id: str
    clauses: list[ClauseReviewCreate]


class DocumentReviewSummary(BaseModel):
    """Top-level stats shown in the review dashboard header."""
    model_config = ConfigDict(from_attributes=True)

    total_clauses: int
    likely_unenforceable_count: int
    needs_review_count: int
    compliant_count: int
    informational_count: int


class DocumentReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    review_status: ReviewStatus
    summary: DocumentReviewSummary
    clauses: list[ClauseReviewResponse]
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ClauseMarkReviewedRequest(BaseModel):
    is_reviewed: bool = True
