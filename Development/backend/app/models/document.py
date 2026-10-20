"""
Document Pydantic Schemas
==========================
Request / response models for the Document API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.models.document import DocumentStatus


# ── Response schemas ───────────────────────────────────────────────────────────


class DocumentResponse(BaseModel):
    """Single document metadata returned by the API."""


    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True
    )

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
    
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    message: str
    document: DocumentResponse


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int