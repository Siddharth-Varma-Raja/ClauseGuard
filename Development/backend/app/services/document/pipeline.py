"""
Document Processing Pipeline
==============================
Orchestrates the three steps that happen before a file lands in GCS:

    1. Text Extraction  (extractor.py)  — PDF or image via OCR
    2. PII / Clause Redaction  (redactor.py ← teammate's code)
    3. GCS Upload  (storage.py)

Why a dedicated pipeline module?
---------------------------------
• Keeps each service unaware of the others.
• Gives a single place to add retry logic, metrics, or async queuing
  later without touching the route handler or individual services.
• Makes unit testing trivial — mock the three callables and test flow.
"""

import logging
import time
import uuid
from collections.abc import Callable

from app.services.document import estimate
from app.services.document.extractor import extract_text
from app.services.document.redactor import RedactionError, redact
from app.services.document.storage import upload_text_to_gcs, GCSStorageError
from document_checker.diff_engine import TemplateDiffEngine

logger = logging.getLogger(__name__)


StepCallback = Callable[[str, float], None]
EstimateCallback = Callable[[float], None]


def _report(on_step: StepCallback | None, step: str, seconds: float) -> None:
    """Tell the caller a step has finished. Progress reporting never breaks an upload."""
    if on_step is None:
        return
    try:
        on_step(step, seconds)
    except Exception:
        logger.exception("[pipeline] Progress callback failed for step '%s'.", step)


def _estimate(on_estimate: EstimateCallback | None, remaining_seconds: float) -> None:
    """Tell the caller how long the rest of the pipeline should take. Never breaks an upload."""
    if on_estimate is None:
        return
    try:
        on_estimate(remaining_seconds)
    except Exception:
        logger.exception("[pipeline] Estimate callback failed.")


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
    gcs_key_prefix: str = "documents/",
    on_step: StepCallback | None = None,
    on_estimate: EstimateCallback | None = None,
) -> dict:
    """
    Run the full Extract → Validate Lease → Redact → Upload pipeline.

    ``on_step(step, seconds)`` is called as each step finishes, with the step
    name ("extract", "lease_check", "redact", "store") and its duration.
    ``on_estimate(seconds)`` is called whenever the expected remaining time is
    known or changes: once extraction knows how many pages need OCR, and after
    each later step. The rules-engine save that follows is included.
    """
    unique_id = str(uuid.uuid4())
    gcs_key = f"{gcs_key_prefix}{user_id}/{unique_id}.txt"

    # ── Step 1: Extract ───────────────────────────────────────────────
    logger.info(
        "[pipeline] Starting extraction for user_id='%s' (type=%s).",
        user_id,
        content_type,
    )
    timings: dict[str, float] = {}
    t0 = time.perf_counter()
    try:
        raw_text = extract_text(
            file_bytes,
            content_type,
            on_plan=lambda pages, ocr_pages: _estimate(
                on_estimate, estimate.from_extraction_plan(pages, ocr_pages)
            ),
        )
    except Exception as exc:
        logger.exception("[pipeline] Extraction failed.")
        raise PipelineError(f"Text extraction failed: {exc}", step="extraction") from exc

    timings["extract"] = time.perf_counter() - t0
    _report(on_step, "extract", timings["extract"])
    _estimate(on_estimate, estimate.after_extract_seconds(len(raw_text)))
    logger.info("[pipeline] Extraction complete — %d chars.", len(raw_text))
    t0 = time.perf_counter()

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

    timings["lease_check"] = time.perf_counter() - t0
    _report(on_step, "lease_check", timings["lease_check"])

    # ── Step 3: Redact ────────────────────────────────────────────────
    logger.info("[pipeline] Starting redaction.")
    t0 = time.perf_counter()
    try:
        redacted_text = redact(raw_text)
    except RedactionError as exc:
        logger.exception("[pipeline] Redaction failed.")
        raise PipelineError(f"Redaction failed: {exc}", step="redaction") from exc
    except Exception as exc:
        logger.exception("[pipeline] Unexpected redaction error.")
        raise PipelineError(f"Redaction error: {exc}", step="redaction") from exc

    timings["redact"] = time.perf_counter() - t0
    _report(on_step, "redact", timings["redact"])
    _estimate(on_estimate, estimate.after_redact_seconds())
    logger.info("[pipeline] Redaction complete — %d chars remaining.", len(redacted_text))
    t0 = time.perf_counter()

    # ── Step 4: Upload ────────────────────────────────────────────────
    logger.info("[pipeline] Uploading to GCS key '%s'.", gcs_key)
    try:
        gcs_uri = upload_text_to_gcs(redacted_text, gcs_key)
    except GCSStorageError as exc:
        raise PipelineError(f"GCS upload failed: {exc}", step="upload") from exc

    timings["upload"] = time.perf_counter() - t0
    _report(on_step, "store", timings["upload"])
    _estimate(on_estimate, estimate.ANALYSE_SECONDS)
    logger.info("[pipeline] Pipeline complete → %s", gcs_uri)
    logger.info(
        "[pipeline] Timings: %s | total %.2fs",
        ", ".join(f"{k} {v:.2f}s" for k, v in timings.items()),
        sum(timings.values()),
    )
    return {
        "gcs_uri": gcs_uri,
        "gcs_key": gcs_key,
        "char_count": len(redacted_text),
        "redacted_text": redacted_text,  
    }
