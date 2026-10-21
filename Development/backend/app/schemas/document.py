"""
Document Pydantic Schemas
==========================
Request / response models for the Document API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentStatus


# ── Response schemas ───────────────────────────────────────────────────────────


class DocumentResponse(BaseModel):
    """Single document metadata returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    original_filename: str
    content_type: str
    file_size_bytes: int
    sha256_hash: str
    s3_key: str | None
    s3_uri: str | None
    status: DocumentStatus
    char_count: int | None
    pipeline_error: str | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class DocumentUploadResponse(BaseModel):
    """Response returned after a successful upload + pipeline run."""

    message: str
    document: DocumentResponse


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int
