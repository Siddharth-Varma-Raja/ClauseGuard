"""
Translation & Frontend API Router
==================================
Maps frontend requests from Next.js (defined in `frontend/lib/api.ts`)
to ClauseGuard database models, serializing output to camelCase
and mapping status levels (likely_unenforceable -> red, etc.).
"""

import json
import logging
import magic
import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status, Request
from starlette.concurrency import run_in_threadpool
from google import genai
from google.genai import types
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.core.rate_limit import limiter
from app.core.firebase import revoke_refresh_tokens
from app.database import get_db
from app.models.chat import ChatMessage, ChatRole
from app.models.document import Document, DocumentStatus
from app.models.notice import Notice
from app.models.preference import UserPreference
from app.models.review import (
    ClauseReview,
    ClauseSource,
    DocumentReview,
    ReviewStatus,
    RiskLevel,
    SourceType,
)
from app.models.timeline import TimelineEvent
from app.models.user import AuditLog, User
from app.schemas.translation import (
    AnalysisDetail,
    AnalysisSummary,
    ClauseItem,
    ClauseQuestionRequest,
    ClauseQuestionResponse,
    ClauseReviewedRequest,
    CreateNoticeResponse,
    EmailDraftRequest,
    EmailDraftResponse,
    NewTimelineEventRequest,
    NoticeCheckItem,
    NoticeDetail,
    NoticeInputRequest,
    NoticeKeyDateItem,
    NoticeSummaryItem,
    PreferencesResponse,
    PreferencesUpdateRequest,
    SourceItem,
    StatusCounts,
    TimelineEventItem,
    TimelineEventUpdateRequest,
    UploadLeaseResponse,
    UserProfileResponse,
)
from app.services.analysis.persist import save_analysis
from app.services.document.pipeline import PipelineError, run_upload_pipeline
from app.services.document.gcs import delete_from_gcs
from app.services.notice_checker import check_notice_rules
from app.services.email_generator import generate_landlord_email

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Helper Mappings ────────────────────────────────────────────────────────────

def map_risk_to_status(risk_level: Any) -> str:
    """Map backend RiskLevel enum to frontend status colors."""
    val = risk_level.value if hasattr(risk_level, "value") else str(risk_level)
    mapping = {
        "likely_unenforceable": "red",
        "needs_review": "amber",
        "compliant": "green",
        "informational": "grey",
    }
    return mapping.get(val, "grey")


def get_genai_client() -> genai.Client:
    api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured in backend environment.",
        )
    return genai.Client(api_key=api_key)


_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}
_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024


# ═══════════════════════════════════════════════════════════════════════════════
# 1. ANALYSES / LEASES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/analyses", response_model=List[AnalysisSummary], tags=["Analyses"])
async def get_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[AnalysisSummary]:
    """List all analyses for the current authenticated user."""
    docs_result = await db.execute(
        select(Document)
        .where(
            Document.user_id == current_user.id,
            Document.is_deleted == False,  
        )
        .order_by(Document.created_at.desc())
    )
    docs = docs_result.scalars().all()

    summaries: List[AnalysisSummary] = []
    for doc in docs:
        review_result = await db.execute(
            select(DocumentReview).where(DocumentReview.document_id == doc.id)
        )
        review = review_result.scalar_one_or_none()

        counts = StatusCounts()
        prop_addr = None
        if review:
            counts.red = review.likely_unenforceable_count
            counts.amber = review.needs_review_count
            counts.green = review.compliant_count
            counts.grey = review.informational_count
            prop_addr = review.property_address

        summaries.append(
            AnalysisSummary(
                id=doc.id,
                file_name=doc.original_filename,
                created_at=doc.created_at.isoformat(),
                property_address=prop_addr,
                counts=counts,
            )
        )

    return summaries


@router.get("/analyses/{id}", response_model=AnalysisDetail, tags=["Analyses"])
async def get_analysis(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalysisDetail:
    """Retrieve full clause-by-clause analysis for a document."""
    doc_result = await db.execute(
        select(Document).where(
            Document.id == id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  
        )
    )
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        )

    review_result = await db.execute(
        select(DocumentReview).where(DocumentReview.document_id == id)
    )
    review = review_result.scalar_one_or_none()

    counts = StatusCounts()
    clauses_list: List[ClauseItem] = []
    prop_address = None
    monthly_rent = None
    deposit = None
    tenancy_start = None
    term_months = None
    page_count = 1

    if review:
        counts.red = review.likely_unenforceable_count
        counts.amber = review.needs_review_count
        counts.green = review.compliant_count
        counts.grey = review.informational_count
        prop_address = review.property_address
        monthly_rent = review.monthly_rent_cents
        deposit = review.deposit_cents
        tenancy_start = review.tenancy_start
        term_months = review.term_months
        page_count = review.page_count or 1

        for c in review.clauses:
            steps: List[str] = []
            if c.suggested_steps:
                try:
                    steps = json.loads(c.suggested_steps)
                except Exception:
                    steps = [c.suggested_steps]

            sources: List[SourceItem] = []
            for s in c.sources:
                sources.append(
                    SourceItem(
                        kind=s.source_type.value if hasattr(s.source_type, "value") else str(s.source_type),
                        title=s.source_name,
                        url=s.link,
                        note=s.description,
                    )
                )

            clauses_list.append(
                ClauseItem(
                    id=c.id,
                    number=str(c.clause_number),
                    title=c.clause_title,
                    text=c.clause_text,
                    page=getattr(c, "page", 1) or 1,
                    status=map_risk_to_status(c.risk_level),
                    confidence=getattr(c, "confidence", "high") or "high",
                    explanation=c.plain_english or "",
                    reason=c.flagging_reason or "",
                    next_steps=steps,
                    sources=sources,
                    reviewed=c.is_reviewed,
                )
            )

    return AnalysisDetail(
        id=doc.id,
        file_name=doc.original_filename,
        created_at=doc.created_at.isoformat(),
        property_address=prop_address,
        counts=counts,
        monthly_rent_cents=monthly_rent,
        deposit_cents=deposit,
        tenancy_start=tenancy_start,
        term_months=term_months,
        page_count=page_count,
        clauses=clauses_list,
    )


@router.post(
    "/analyses",
    response_model=UploadLeaseResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Analyses"],
)
async def upload_lease(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadLeaseResponse:
    """Upload a lease document and run the extraction and analysis pipeline."""
    # ── 1. Read and validate the uploaded file ─────────────────────────────────
    file_bytes = await file.read()

    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 25 MB size limit.",
        )
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    actual_mime_type = magic.from_buffer(file_bytes, mime=True)
    if actual_mime_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{actual_mime_type}'. Supported: PDF, DOCX, Images.",
        )

    original_filename = file.filename or "lease.pdf"

    # ── 2. Create document record ──────────────────────────────────────────────
    doc = Document(
        user_id=current_user.id,
        original_filename=original_filename,
        content_type=actual_mime_type,
        file_size_bytes=len(file_bytes),
        sha256_hash=Document.compute_hash(file_bytes),
        status=DocumentStatus.PROCESSING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # ── 3. Run upload pipeline (including diff_engine lease verification) ──────
    try:
        pipeline_result = await asyncio.to_thread(
            run_upload_pipeline,
            file_bytes=file_bytes,
            user_id=current_user.id,
            content_type=actual_mime_type,
        )
        doc.gcs_uri = pipeline_result.get("gcs_uri")
        doc.gcs_key = pipeline_result.get("gcs_key")
        doc.char_count = pipeline_result.get("char_count")
        doc.status = DocumentStatus.COMPLETED
    except PipelineError as exc:
        doc.status = DocumentStatus.FAILED
        doc.pipeline_error = str(exc)
        await db.commit()
        if exc.step == "lease_validation":
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload pipeline failed during {exc.step}: {exc}",
        )
    except Exception as exc:
        logger.exception(f"Unexpected error during upload pipeline: {exc}")
        doc.status = DocumentStatus.FAILED
        doc.pipeline_error = str(exc)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the document.",
        )

    # ── 4. Analyse the redacted lease text (rules engine) and store result ─────
    try:
        review = await save_analysis(db, doc.id, pipeline_result["redacted_text"])
        await db.commit()
    except Exception as exc:
        logger.exception(f"Analysis failed: {exc}")
        await db.rollback()
        doc.status = DocumentStatus.FAILED
        doc.pipeline_error = f"analysis: {exc}"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The lease was uploaded but could not be analysed.",
        )

    return UploadLeaseResponse(
        id=doc.id,
        message="Lease document uploaded and analyzed successfully.",
        file_name=doc.original_filename,
        file_size_bytes=doc.file_size_bytes,
        status=doc.status.value if hasattr(doc.status, "value") else str(doc.status),
        gcs_key=doc.gcs_key,
        char_count=doc.char_count,
        counts=StatusCounts(
            red=review.likely_unenforceable_count,
            amber=review.needs_review_count,
            green=review.compliant_count,
            grey=review.informational_count,
        ),
    )


@router.patch("/analyses/{analysis_id}/clauses/{clause_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Analyses"])
async def set_clause_reviewed(
    analysis_id: str,
    clause_id: str,
    body: ClauseReviewedRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Mark a specific clause as reviewed or unreviewed."""
    result = await db.execute(
        select(ClauseReview)
        .join(DocumentReview, ClauseReview.review_id == DocumentReview.id)
        .join(Document, DocumentReview.document_id == Document.id)
        .where(
            ClauseReview.id == clause_id,
            DocumentReview.document_id == analysis_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    clause = result.scalar_one_or_none()