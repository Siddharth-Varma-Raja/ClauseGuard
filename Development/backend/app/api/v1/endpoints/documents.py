"""
Document Upload API Endpoint
==============================
POST /api/v1/documents/upload

Accepts a multipart PDF upload, runs it through the
Extract → Redact → S3 pipeline, and returns the S3 location.
"""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.document.pipeline import PipelineError, run_upload_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

# ── Response schema ────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    s3_uri: str
    s3_key: str
    char_count: int


# ── Helpers ────────────────────────────────────────────────────────────────────

_ALLOWED_CONTENT_TYPES = {"application/pdf"}
_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _validate_upload(file: UploadFile) -> None:
    """Raise HTTP 422 for unsupported file types."""
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{file.content_type}'. Only PDF files are accepted.",
        )


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a PDF document",
    description=(
        "Upload a PDF file.  The server will extract its text, apply PII/clause "
        "redaction, and store the processed result in S3.  The original PDF is "
        "**never** persisted — only the redacted text file reaches S3."
    ),
)
async def upload_document(
    file: UploadFile = File(..., description="PDF file to upload (max 20 MB)"),
    current_user: User = Depends(get_current_user),
) -> UploadResponse:
    """
    Pipeline: Extract → Redact → Upload to S3.

    - **file**: multipart PDF upload.
    - Requires a valid Firebase Bearer token.
    """
    _validate_upload(file)

    pdf_bytes = await file.read()

    if len(pdf_bytes) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 20 MB size limit.",
        )

    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    logger.info(
        "Upload request — user=%s file='%s' size=%d bytes",
        current_user.id,
        file.filename,
        len(pdf_bytes),
    )

    # ── Run pipeline (blocking I/O; move to BackgroundTask or thread pool if needed) ──
    try:
        result = run_upload_pipeline(
            pdf_bytes=pdf_bytes,
            original_filename=file.filename or "document.pdf",
        )
    except PipelineError as exc:
        # Map each pipeline step to an appropriate HTTP status
        step_status_map = {
            "extraction": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "redaction":  status.HTTP_500_INTERNAL_SERVER_ERROR,
            "upload":     status.HTTP_502_BAD_GATEWAY,
        }
        http_status = step_status_map.get(exc.step, status.HTTP_500_INTERNAL_SERVER_ERROR)
        raise HTTPException(status_code=http_status, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during document upload pipeline.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the document.",
        ) from exc

    return UploadResponse(
        message="Document processed and uploaded successfully.",
        s3_uri=result["s3_uri"],
        s3_key=result["s3_key"],
        char_count=result["char_count"],
    )
