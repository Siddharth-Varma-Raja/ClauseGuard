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
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from google import genai
from google.genai import types
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
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
from app.services.document.s3 import delete_from_s3
from app.services.notice_checker import check_notice_rules

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
            Document.is_deleted == False,  # noqa: E712
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
            Document.is_deleted == False,  # noqa: E712
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

    # Create document record
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

    # Run upload pipeline (including diff_engine lease verification)
    try:
        pipeline_result = run_upload_pipeline(
            file_bytes=file_bytes,
            user_id=current_user.id,
            content_type=actual_mime_type,
        )
        doc.s3_uri = pipeline_result["s3_uri"]
        doc.s3_key = pipeline_result["s3_key"]
        doc.char_count = pipeline_result["char_count"]
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

    # Analyse the redacted lease text (language stream + rules engine) and store the result.
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
        s3_key=doc.s3_key,
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
    if not clause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clause or analysis not found.",
        )

    clause.is_reviewed = body.reviewed
    clause.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/analyses", status_code=status.HTTP_204_NO_CONTENT, tags=["Analyses"])
async def delete_all_analyses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Soft-delete all analyses for the current user and wipe S3 files."""
    docs_result = await db.execute(
        select(Document).where(
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    docs = docs_result.scalars().all()

    for doc in docs:
        if doc.s3_key:
            try:
                delete_from_s3(doc.s3_key)
            except Exception as e:
                logger.error(f"Error deleting S3 file {doc.s3_key}: {e}")
        doc.is_deleted = True
        doc.deleted_at = datetime.now(timezone.utc)

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/analyses/{analysis_id}/clauses/{clause_id}/questions",
    response_model=ClauseQuestionResponse,
    tags=["Analyses"],
)
async def ask_clause_question(
    analysis_id: str,
    clause_id: str,
    body: ClauseQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ClauseQuestionResponse:
    """
    Ask a targeted question about a specific clause with AI privacy isolation.
    Sends only the clause text and the question to the AI model.
    """
    # Verify ownership and clause relationship
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
    if not clause:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Clause or analysis not found.",
        )

    system_instruction = (
        "You are the ClauseGuard Legal Assistant. You are an expert in Irish residential tenancy law (Residential Tenancies Acts). "
        "Answer the tenant's question about the specific lease clause below. "
        "Evaluate the clause strictly under Irish RTB regulations. "
        "Return plain text only (do NOT return HTML or markdown tags). "
        "Keep your answer concise, clear, and actionable in plain English."
    )

    contents = []
    # Map prior history (accepts role 'assistant' or 'user')
    for item in body.history:
        role = "model" if item.get("role") in ["assistant", "model"] else "user"
        msg_text = item.get("text") or item.get("content") or ""
        if msg_text:
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg_text)]))

    # Send only the clause text and user question
    prompt = (
        f"--- LEASE CLAUSE ---\n"
        f"Title: {clause.clause_title}\n"
        f"Text: {clause.clause_text}\n"
        f"-------------------\n\n"
        f"Tenant Question: {body.question}"
    )
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=prompt)]))

    try:
        client = get_genai_client()
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )
        reply = response.text or "No response could be generated."
    except Exception as e:
        logger.error(f"Per-clause AI question error: {e}")
        reply = (
            f"Under Irish tenancy law, this clause ('{clause.clause_title}') should be reviewed carefully. "
            f"Irish Residential Tenancies legislation provides mandatory statutory protections regarding "
            f"notice periods, peaceful occupation, and rent pressure zone limits that override contradictory contract terms."
        )

    return ClauseQuestionResponse(answer=reply.strip())


# ═══════════════════════════════════════════════════════════════════════════════
# 2. LANDLORD NOTICES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/notices", response_model=List[NoticeSummaryItem], tags=["Notices"])
async def get_notices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[NoticeSummaryItem]:
    """List notice review summaries for the current user."""
    result = await db.execute(
        select(Notice)
        .where(Notice.user_id == current_user.id)
        .order_by(Notice.created_at.desc())
    )
    notices = result.scalars().all()

    return [
        NoticeSummaryItem(
            id=n.id,
            type=n.notice_type,
            verdict=n.verdict,
            summary=n.summary,
            created_at=n.created_at.isoformat(),
        )
        for n in notices
    ]


@router.get("/notices/{id}", response_model=NoticeDetail, tags=["Notices"])
async def get_notice(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NoticeDetail:
    """Get full evaluation details for a specific notice."""
    result = await db.execute(
        select(Notice).where(Notice.id == id, Notice.user_id == current_user.id)
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notice not found.",
        )

    checks = json.loads(n.checks_json) if n.checks_json else []
    key_dates = json.loads(n.key_dates_json) if n.key_dates_json else []
    next_steps = json.loads(n.next_steps_json) if n.next_steps_json else []

    return NoticeDetail(
        id=n.id,
        type=n.notice_type,
        verdict=n.verdict,
        summary=n.summary,
        created_at=n.created_at.isoformat(),
        checks=[NoticeCheckItem(**c) for c in checks],
        key_dates=[NoticeKeyDateItem(**kd) for kd in key_dates],
        next_steps=next_steps,
    )


@router.post("/notices", response_model=CreateNoticeResponse, status_code=status.HTTP_201_CREATED, tags=["Notices"])
async def create_notice_check(
    body: NoticeInputRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CreateNoticeResponse:
    """Submit a notice for legal compliance verification."""
    eval_result = check_notice_rules(body.type, body.answers)

    notice = Notice(
        user_id=current_user.id,
        notice_type=body.type,
        verdict=eval_result["verdict"],
        summary=eval_result["summary"],
        checks_json=json.dumps(eval_result["checks"]),
        key_dates_json=json.dumps(eval_result["key_dates"]),
        next_steps_json=json.dumps(eval_result["next_steps"]),
        answers_json=json.dumps(body.answers),
    )
    db.add(notice)
    await db.commit()
    await db.refresh(notice)

    return CreateNoticeResponse(id=notice.id)


# ═══════════════════════════════════════════════════════════════════════════════
# 3. TENANCY TIMELINE
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/events", response_model=List[TimelineEventItem], tags=["Timeline"])
async def get_timeline_events(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[TimelineEventItem]:
    """Retrieve all tenancy timeline events for the current user."""
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.user_id == current_user.id)
        .order_by(TimelineEvent.event_date.asc())
    )
    events = result.scalars().all()

    return [
        TimelineEventItem(
            id=e.id,
            title=e.title,
            date=e.event_date,
            kind=e.kind,
            note=e.note or "",
            done=e.done,
        )
        for e in events
    ]


@router.post("/events", response_model=TimelineEventItem, status_code=status.HTTP_201_CREATED, tags=["Timeline"])
async def add_timeline_event(
    body: NewTimelineEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TimelineEventItem:
    """Add a new milestone or deadline to the tenancy timeline."""
    event = TimelineEvent(
        user_id=current_user.id,
        title=body.title,
        event_date=body.date,
        kind=body.kind,
        note=body.note,
        done=False,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return TimelineEventItem(
        id=event.id,
        title=event.title,
        date=event.event_date,
        kind=event.kind,
        note=event.note or "",
        done=event.done,
    )


@router.patch("/events/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Timeline"])
async def set_event_done(
    id: str,
    body: TimelineEventUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Toggle the completion state of a timeline event."""
    result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.id == id, TimelineEvent.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    event.done = body.done
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/events/{id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Timeline"])
async def delete_timeline_event(
    id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Delete a tenancy timeline event."""
    result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.id == id, TimelineEvent.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    await db.delete(event)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. USER PREFERENCES & ACCOUNT DATA
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/me/preferences", response_model=PreferencesResponse, tags=["Preferences"])
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreferencesResponse:
    """Get the current user's explanation and notification preferences."""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(
            user_id=current_user.id,
            explanation_detail="simple",
            reminders_enabled=True,
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    return PreferencesResponse(
        explanation_detail=pref.explanation_detail,
        reminders_enabled=pref.reminders_enabled,
    )


@router.patch("/me/preferences", response_model=PreferencesResponse, tags=["Preferences"])
async def update_preferences(
    body: PreferencesUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreferencesResponse:
    """Update explanation detail or reminder preferences."""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = UserPreference(user_id=current_user.id)
        db.add(pref)

    if body.explanation_detail is not None:
        pref.explanation_detail = body.explanation_detail
    if body.reminders_enabled is not None:
        pref.reminders_enabled = body.reminders_enabled

    pref.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(pref)

    return PreferencesResponse(
        explanation_detail=pref.explanation_detail,
        reminders_enabled=pref.reminders_enabled,
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, tags=["Account"])
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Cascading account deletion: removes stored files from S3, soft-deletes/purges
    analyses, notices, timeline events, preferences, and revokes Firebase tokens.
    """
    # 1. Wipe S3 files and soft-delete documents
    docs_result = await db.execute(
        select(Document).where(Document.user_id == current_user.id)
    )
    for doc in docs_result.scalars().all():
        if doc.s3_key:
            try:
                delete_from_s3(doc.s3_key)
            except Exception as e:
                logger.error(f"Error deleting S3 key {doc.s3_key}: {e}")
        doc.is_deleted = True
        doc.deleted_at = datetime.now(timezone.utc)

    # 2. Delete user's notices, timeline events, preferences
    notices_result = await db.execute(
        select(Notice).where(Notice.user_id == current_user.id)
    )
    for n in notices_result.scalars().all():
        await db.delete(n)

    events_result = await db.execute(
        select(TimelineEvent).where(TimelineEvent.user_id == current_user.id)
    )
    for ev in events_result.scalars().all():
        await db.delete(ev)

    pref_result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    for p in pref_result.scalars().all():
        await db.delete(p)

    # 3. Deactivate user and revoke Firebase refresh tokens
    current_user.is_active = False
    current_user.updated_at = datetime.now(timezone.utc)
    try:
        revoke_refresh_tokens(current_user.firebase_uid)
    except Exception as e:
        logger.warning(f"Failed to revoke Firebase token for {current_user.firebase_uid}: {e}")

    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserProfileResponse, tags=["Account"])
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserProfileResponse:
    """Retrieve profile details for the authenticated user."""
    return UserProfileResponse(
        id=current_user.id,
        firebase_uid=current_user.firebase_uid,
        email=current_user.email,
        display_name=current_user.display_name,
        phone_number=current_user.phone_number,
        role=current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat(),
    )


@router.get("/me/gdpr-export", tags=["Account"])
async def gdpr_export(
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Export all stored data for the authenticated user under GDPR Article 15."""
    return {
        "user": {
            "id": current_user.id,
            "firebaseUid": current_user.firebase_uid,
            "email": current_user.email,
            "displayName": current_user.display_name,
            "phoneNumber": current_user.phone_number,
            "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
            "createdAt": current_user.created_at.isoformat(),
        },
        "exportedAt": datetime.now(timezone.utc).isoformat(),
    }
