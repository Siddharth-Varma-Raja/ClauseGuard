"""
Document API Endpoints
========================
POST   /api/v1/documents/upload   — Upload a PDF or image → pipeline → save to MySQL
GET    /api/v1/documents/          — List the current user's documents
GET    /api/v1/documents/{id}      — Get a single document by ID
DELETE /api/v1/documents/{id}      — Soft-delete a document
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.document import Document, DocumentStatus
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.services.document.pipeline import PipelineError, run_upload_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

# ── Constants ──────────────────────────────────────────────────────────────────

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}
_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


# ── Helpers ────────────────────────────────────────────────────────────────────


def _validate_upload(file: UploadFile) -> None:
    """Raise HTTP 422 for unsupported file types."""
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Accepted formats: PDF, JPEG, PNG, TIFF, WebP, BMP."
            ),
        )


# ── POST /upload ───────────────────────────────────────────────────────────────


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a lease document (PDF or image)",
    description=(
        "Upload a PDF or image file (JPEG, PNG, TIFF, WebP, BMP).  "
        "The server auto-detects the file type, extracts text "
        "(using OCR for images and scanned PDFs), applies PII/clause "
        "redaction, and stores the processed result in S3.  The original "
        "file is **never** persisted — only the redacted text reaches S3.  "
        "A metadata record is saved to MySQL for ownership, audit, and querying."
    ),
)
async def upload_document(
    file: UploadFile = File(..., description="PDF or image file to upload (max 20 MB)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    _validate_upload(file)

    file_bytes = await file.read()

    if len(file_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 20 MB size limit.",
        )

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    content_type = file.content_type or "application/pdf"
    original_filename = file.filename or "document"

    logger.info(
        "Upload request — user=%s file='%s' size=%d bytes",
        current_user.id,
        original_filename,
        len(file_bytes),
    )

    # ── Create document record with PROCESSING status ──────────────────────
    doc = Document(
        user_id=current_user.id,
        original_filename=original_filename,
        content_type=content_type,
        file_size_bytes=len(file_bytes),
        sha256_hash=Document.compute_hash(file_bytes),
        status=DocumentStatus.PROCESSING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # ── Run pipeline ───────────────────────────────────────────────────────
    try:
        result = run_upload_pipeline(
            file_bytes=file_bytes,
            original_filename=original_filename,
            content_type=content_type,
        )
    except PipelineError as exc:
        # Mark the document as FAILED in MySQL
        doc.status = DocumentStatus.FAILED
        doc.pipeline_error = str(exc)
        await db.commit()
        await db.refresh(doc)

        step_status_map = {
            "extraction": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "redaction":  status.HTTP_500_INTERNAL_SERVER_ERROR,
            "upload":     status.HTTP_502_BAD_GATEWAY,
        }
        http_status = step_status_map.get(exc.step, status.HTTP_500_INTERNAL_SERVER_ERROR)
        raise HTTPException(status_code=http_status, detail=str(exc)) from exc
    except Exception as exc:
        doc.status = DocumentStatus.FAILED
        doc.pipeline_error = str(exc)
        await db.commit()

        logger.exception("Unexpected error during document upload pipeline.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the document.",
        ) from exc

    # ── Update document with pipeline results ──────────────────────────────
    doc.s3_uri = result["s3_uri"]
    doc.s3_key = result["s3_key"]
    doc.char_count = result["char_count"]
    doc.status = DocumentStatus.COMPLETED
    await db.commit()
    await db.refresh(doc)

    logger.info("Document saved — id=%s s3_key=%s", doc.id, doc.s3_key)

    return DocumentUploadResponse(
        message="Document processed and uploaded successfully.",
        document=DocumentResponse.model_validate(doc),
    )


# ── GET / ──────────────────────────────────────────────────────────────────────


@router.get(
    "/",
    response_model=DocumentListResponse,
    summary="List your documents",
    description="Returns a paginated list of documents belonging to the current user.",
)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    base_filter = (
        (Document.user_id == current_user.id)
        & (Document.is_deleted == False)  # noqa: E712
    )

    # Total count
    total_result = await db.execute(
        select(func.count()).select_from(Document).where(base_filter)
    )
    total = total_result.scalar_one()

    # Paginated rows
    offset = (page - 1) * page_size
    rows_result = await db.execute(
        select(Document)
        .where(base_filter)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    docs = rows_result.scalars().all()

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── GET /{document_id} ────────────────────────────────────────────────────────


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details",
    description="Returns metadata for a single document owned by the current user.",
)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return DocumentResponse.model_validate(doc)


# ── DELETE /{document_id} ─────────────────────────────────────────────────────


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Soft-delete a document",
    description=(
        "Marks a document as deleted without physically removing data. "
        "The record is retained for audit and GDPR compliance purposes."
    ),
)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from datetime import datetime, timezone

    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,  # noqa: E712
        )
    )
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Document deleted successfully.", "document_id": doc.id}
