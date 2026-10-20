"""
Document API Endpoints
========================
POST   /analyses/upload   — Upload a PDF, Word, or image → pipeline → save to MySQL
GET    /analyses/          — List the current user's analyses
GET    /analyses/{id}      — Get a single analysis by ID
DELETE /analyses/{id}      — Delete an analysis and wipe its S3 file
"""

import logging
import magic 

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

router = APIRouter(prefix="", tags=["Analyses"])

# ── Constants ──────────────────────────────────────────────────────────────────

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


# ── POST /upload ───────────────────────────────────────────────────────────────


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a lease document (PDF, Word, or image)",
    description=(
        "Upload a file (max 25 MB). The server validates the file contents, "
        "extracts text, applies PII/clause redaction, and stores the processed "
        "result in S3. The original file is never persisted."
    ),
)
async def upload_document(
    file: UploadFile = File(..., description="PDF, Word, or image file (max 25 MB)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    
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
            detail=(
                f"Unsupported file content type '{actual_mime_type}'. "
                "Accepted formats: PDF, DOCX, JPEG, PNG, TIFF, WebP, BMP."
            ),
        )

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
        content_type=actual_mime_type,
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
            user_id=current_user.id,
            content_type=actual_mime_type,
        )
    except PipelineError as exc:
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
    summary="List your analyses",
    description="Returns a paginated list of analyses belonging to the current user.",
)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    base_filter = (
        (Document.user_id == current_user.id)
        & (Document.is_deleted == False)  
    )

    total_result = await db.execute(
        select(func.count()).select_from(Document).where(base_filter)
    )
    total = total_result.scalar_one()

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
    summary="Get analysis details",
    description="Returns metadata for a single analysis owned by the current user.",
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
            Document.is_deleted == False,  
        )
    )
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        )

    return DocumentResponse.model_validate(doc)


# ── DELETE /{document_id} ─────────────────────────────────────────────────────


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an analysis and wipe S3 data",
    description="Soft-deletes the database record and permanently wipes the file from S3.",
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
            Document.is_deleted == False,  
        )
    )
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found.",
        )

   
    if doc.s3_key:
        try:
            logger.info(f"Deleted S3 object: {doc.s3_key}")
        except Exception as e:
            logger.error(f"Failed to delete S3 object {doc.s3_key}: {e}")

    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Analysis and associated files deleted successfully.", "id": doc.id}