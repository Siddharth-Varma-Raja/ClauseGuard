"""
Document Processing Pipeline
==============================
Orchestrates the three steps that happen before a file lands in S3:

    1. Text Extraction  (extractor.py)  — PDF or image via OCR
    2. PII / Clause Redaction  (redactor.py ← teammate's code)
    3. S3 Upload  (s3.py)

Why a dedicated pipeline module?
---------------------------------
• Keeps each service unaware of the others.
• Gives a single place to add retry logic, metrics, or async queuing
  later without touching the route handler or individual services.
• Makes unit testing trivial — mock the three callables and test flow.
"""

import logging
import uuid

from app.services.document.extractor import extract_text
from app.services.document.redactor import RedactionError, redact
from app.services.document.s3 import S3UploadError, upload_text_to_s3
from document_checker.diff_engine import TemplateDiffEngine

logger = logging.getLogger(__name__)


class PipelineError(Exception):
    """
    Raised by ``run_upload_pipeline`` when a step fails.

    Attributes
    ----------
    step : str
        Which step failed: ``"extraction"``, ``"lease_validation"``, ``"redaction"``, or ``"upload"``.
    """

    def __init__(self, message: str, step: str) -> None:
        super().__init__(message)
        self.step = step


def run_upload_pipeline(
    file_bytes: bytes,
    user_id: str,
    content_type: str,
    s3_key_prefix: str = "documents/",
) -> dict:
    """
    Run the full Extract → Validate Lease → Redact → Upload pipeline.
    """
    unique_id = str(uuid.uuid4())
    s3_key = f"{s3_key_prefix}{user_id}/{unique_id}.txt"

    # ── Step 1: Extract ───────────────────────────────────────────────
    logger.info(
        "[pipeline] Starting extraction for user_id='%s' (type=%s).",
        user_id,
        content_type,
    )
    try:
        raw_text = extract_text(file_bytes, content_type)
    except Exception as exc:
        logger.exception("[pipeline] Extraction failed.")
        raise PipelineError(f"Text extraction failed: {exc}", step="extraction") from exc

    logger.info("[pipeline] Extraction complete — %d chars.", len(raw_text))

    # ── Step 2: Validate Lease with Template Diff Engine ──────────────
    logger.info("[pipeline] Validating document with TemplateDiffEngine.")
    diff_engine = TemplateDiffEngine()
    is_lease, confidence, matched_terms = diff_engine.is_lease(raw_text)

    if not is_lease:
        logger.warning(
            "[pipeline] Document rejected: Not a recognized lease (confidence=%.2f, terms=%s)",
            confidence,
            matched_terms,
        )
        raise PipelineError(
            "Uploaded file does not appear to be a residential lease agreement. "
            "Please upload a document containing standard tenancy clauses.",
            step="lease_validation",
        )

    deviations = diff_engine.compare_to_baseline(raw_text)
    logger.info(
        "[pipeline] Verified as lease (confidence=%.2f, %d deviations from RTB baseline).",
        confidence,
        len(deviations),
    )

    # ── Step 3: Redact ────────────────────────────────────────────────
    logger.info("[pipeline] Starting redaction.")
    try:
        redacted_text = redact(raw_text)
    except RedactionError as exc:
        logger.exception("[pipeline] Redaction failed.")
        raise PipelineError(f"Redaction failed: {exc}", step="redaction") from exc
    except Exception as exc:
        logger.exception("[pipeline] Unexpected redaction error.")
        raise PipelineError(f"Redaction error: {exc}", step="redaction") from exc

    logger.info("[pipeline] Redaction complete — %d chars remaining.", len(redacted_text))

    # ── Step 3: Upload ────────────────────────────────────────────────
    logger.info("[pipeline] Uploading to S3 key '%s'.", s3_key)
    try:
        s3_uri = upload_text_to_s3(redacted_text, s3_key)
    except S3UploadError as exc:
        raise PipelineError(f"S3 upload failed: {exc}", step="upload") from exc

    logger.info("[pipeline] Pipeline complete → %s", s3_uri)
    return {
        "s3_uri": s3_uri,
        "s3_key": s3_key,
        "char_count": len(redacted_text),
        "redacted_text": redacted_text,   # in memory only; used by the analysis step, never stored
    }