"""
Document Review API Endpoints
================================
POST   /api/v1/docreview/                      — Submit ML review results for a document
GET    /api/v1/docreview/{document_id}          — Get the full review for a document
PATCH  /api/v1/docreview/clause/{clause_id}     — Mark a clause as reviewed / unreviewed
DELETE /api/v1/docreview/{document_id}          — Delete a review and all its clauses
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.document import Document
from app.models.review import (
    RISK_COLOR_MAP,
    ClauseReview,
    ClauseSource,
    DocumentReview,
    ReviewStatus,
    RiskLevel,
)
from app.models.user import User
from app.schemas.review import (
    ClauseMarkReviewedRequest,
    ClauseReviewResponse,
    ClauseSourceResponse,
    DocumentReviewCreate,
    DocumentReviewResponse,
    DocumentReviewSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/docreview", tags=["Document Review"])


# ── Helpers ────────────────────────────────────────────────────────────────────


def _serialize_clause(clause: ClauseReview) -> ClauseReviewResponse:
    """Convert a ClauseReview ORM object to a Pydantic response."""
    steps = None
    if clause.suggested_steps:
        try:
            steps = json.loads(clause.suggested_steps)
        except (json.JSONDecodeError, TypeError):
            steps = [clause.suggested_steps]

    return ClauseReviewResponse(
        id=clause.id,
        clause_number=clause.clause_number,
        clause_title=clause.clause_title,
        clause_text=clause.clause_text,
        risk_level=clause.risk_level,
        color_code=clause.color_code,
        plain_english=clause.plain_english,
        flagging_reason=clause.flagging_reason,
        suggested_steps=steps,
        is_reviewed=clause.is_reviewed,
        sources=[ClauseSourceResponse.model_validate(s) for s in clause.sources],
        created_at=clause.created_at,
        updated_at=clause.updated_at,
    )


# ── POST / ─────────────────────────────────────────────────────────────────────


@router.post("/", response_model=DocumentReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_document_review(
    body: DocumentReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit the ML model's clause-by-clause review for a document.
    Called by the ML pipeline after processing a document.
    """
    # Verify document exists
    result = await db.execute(select(Document).where(Document.id == body.document_id))
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{body.document_id}' not found.",
        )

    # Check if review already exists
    existing = await db.execute(
        select(DocumentReview).where(DocumentReview.document_id == body.document_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A review already exists for this document. Delete it first to re-submit.",
        )

    # Count by risk level
    counts = {
        RiskLevel.LIKELY_UNENFORCEABLE: 0,
        RiskLevel.NEEDS_REVIEW: 0,
        RiskLevel.COMPLIANT: 0,
        RiskLevel.INFORMATIONAL: 0,
    }
    for clause in body.clauses:
        counts[clause.risk_level] = counts.get(clause.risk_level, 0) + 1

    # Create the review
    review = DocumentReview(
        document_id=body.document_id,
        total_clauses=len(body.clauses),
        likely_unenforceable_count=counts[RiskLevel.LIKELY_UNENFORCEABLE],
        needs_review_count=counts[RiskLevel.NEEDS_REVIEW],
        compliant_count=counts[RiskLevel.COMPLIANT],
        informational_count=counts[RiskLevel.INFORMATIONAL],
        review_status=ReviewStatus.COMPLETED,
        reviewed_at=datetime.now(timezone.utc),
    )
    db.add(review)
    await db.flush()  # Get review.id

    # Create clause reviews with sources
    for clause_data in body.clauses:
        color = clause_data.color_code or RISK_COLOR_MAP.get(clause_data.risk_level, "#6B7280")

        clause_review = ClauseReview(
            review_id=review.id,
            clause_number=clause_data.clause_number,
            clause_title=clause_data.clause_title,
            clause_text=clause_data.clause_text,
            risk_level=clause_data.risk_level,
            color_code=color,
            plain_english=clause_data.plain_english,
            flagging_reason=clause_data.flagging_reason,
            suggested_steps=(
                json.dumps(clause_data.suggested_steps)
                if clause_data.suggested_steps else None
            ),
        )
        db.add(clause_review)
        await db.flush()  # Get clause_review.id

        for source_data in clause_data.sources:
            source = ClauseSource(
                clause_review_id=clause_review.id,
                source_type=source_data.source_type,
                source_name=source_data.source_name,
                act_name=source_data.act_name,
                description=source_data.description,
                link=source_data.link,
            )
            db.add(source)

    await db.commit()

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(DocumentReview).where(DocumentReview.id == review.id)
    )
    review = result.scalar_one()

    return DocumentReviewResponse(
        id=review.id,
        document_id=review.document_id,
        review_status=review.review_status,
        summary=DocumentReviewSummary(
            total_clauses=review.total_clauses,
            likely_unenforceable_count=review.likely_unenforceable_count,
            needs_review_count=review.needs_review_count,
            compliant_count=review.compliant_count,
            informational_count=review.informational_count,
        ),
        clauses=[_serialize_clause(c) for c in review.clauses],
        reviewed_at=review.reviewed_at,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


# ── GET /{document_id} ────────────────────────────────────────────────────────


@router.get("/{document_id}", response_model=DocumentReviewResponse)
async def get_document_review(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the full clause-by-clause review for a document owned by the current user."""
    # Verify the document exists, is not deleted, and belongs to the current user
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    result = await db.execute(
        select(DocumentReview).where(DocumentReview.document_id == document_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No review found for document '{document_id}'.",
        )

    return DocumentReviewResponse(
        id=review.id,
        document_id=review.document_id,
        review_status=review.review_status,
        summary=DocumentReviewSummary(
            total_clauses=review.total_clauses,
            likely_unenforceable_count=review.likely_unenforceable_count,
            needs_review_count=review.needs_review_count,
            compliant_count=review.compliant_count,
            informational_count=review.informational_count,
        ),
        clauses=[_serialize_clause(c) for c in review.clauses],
        reviewed_at=review.reviewed_at,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


# ── PATCH /clause/{clause_id} ─────────────────────────────────────────────────


@router.patch("/clause/{clause_id}", response_model=ClauseReviewResponse)
async def mark_clause_reviewed(
    clause_id: str,
    body: ClauseMarkReviewedRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single clause as reviewed or unreviewed (verifying document ownership)."""
    result = await db.execute(
        select(ClauseReview)
        .join(DocumentReview, ClauseReview.review_id == DocumentReview.id)
        .join(Document, DocumentReview.document_id == Document.id)
        .where(
            ClauseReview.id == clause_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    clause = result.scalar_one_or_none()
    if not clause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Clause '{clause_id}' not found.",
        )

    clause.is_reviewed = body.is_reviewed
    clause.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(clause)

    return _serialize_clause(clause)


# ── DELETE /{document_id} ──────────────────────────────────────────────────────


@router.delete("/{document_id}")
async def delete_document_review(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete the entire review for a document owned by the current user."""
    # Verify document ownership
    doc_result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    if not doc_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )

    result = await db.execute(
        select(DocumentReview).where(DocumentReview.document_id == document_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No review found for document '{document_id}'.",
        )

    await db.delete(review)
    await db.commit()
    return {"message": f"Review for document '{document_id}' deleted successfully."}

