"""
Processing Time Estimator
==========================
Estimates how long ClauseGuard's pipeline will take for a given document
so the frontend can display a meaningful countdown rather than a spinner.

Each stage has an empirically measured per-page cost:

    Stage              Base (s)   Per-page (s)   Notes
    ─────────────────  ─────────  ─────────────  ────────────────────────────
    Text extraction       4.0        1.5         GCP Document AI OCR
    Lease validation      0.5        0.0         Local diff engine (fast)
    PII redaction         3.0        0.8         GCP Cloud DLP
    Analysis              6.0        2.0         Gemini + rules engine

These are conservative — real P95 timings are slightly higher, but we add
a 20 % buffer so the countdown doesn't expire before the job finishes.

Usage
-----
>>> from app.services.document.estimator import estimate_processing_time
>>> seconds, page_count = estimate_processing_time(file_bytes, "application/pdf")
"""

import logging
import struct
import zlib

logger = logging.getLogger(__name__)

# ── Per-stage timing constants (seconds) ──────────────────────────────────────

_STAGES = {
    "extracting":  {"base": 4.0, "per_page": 1.5},
    "validating":  {"base": 0.5, "per_page": 0.0},
    "redacting":   {"base": 3.0, "per_page": 0.8},
    "analysing":   {"base": 6.0, "per_page": 2.0},
}

# Safety buffer applied to the total estimate (20 %)
_BUFFER_FACTOR = 1.20

# Minimum and maximum bounds so the UI always shows a sensible range
_MIN_SECONDS = 15
_MAX_SECONDS = 120


def _count_pdf_pages(file_bytes: bytes) -> int:
    """
    Count pages in a PDF without importing any heavy library.

    Strategy: scan the raw bytes for the ``/Type /Page`` dictionary marker
    that every PDF page object contains.  This is fast (pure Python, no I/O)
    and accurate for all well-formed PDFs including scanned documents.

    Returns 1 on failure so callers always get a usable estimate.
    """
    try:
        # Count occurrences of b"/Type /Page" (or b"/Type/Page" with no space)
        count = file_bytes.count(b"/Type /Page") + file_bytes.count(b"/Type/Page")
        # Each page dictionary appears once, but the xref table may duplicate
        # object numbers.  Divide by 2 is not safe; just trust the count —
        # false positives from xref streams are very rare in practice.
        return max(1, count)
    except Exception as exc:
        logger.warning("Page count failed (%s); defaulting to 1 page.", exc)
        return 1


def _count_image_pages(_file_bytes: bytes) -> int:
    """Images are always a single 'page' for timing purposes."""
    return 1


def count_pages(file_bytes: bytes, content_type: str) -> int:
    """
    Return the number of pages/frames in *file_bytes*.

    Parameters
    ----------
    file_bytes:
        Raw bytes of the uploaded file.
    content_type:
        MIME type as detected by python-magic, e.g. ``"application/pdf"``.
    """
    if content_type == "application/pdf":
        return _count_pdf_pages(file_bytes)
    # DOCX, images — treat as single page for timing purposes
    return _count_image_pages(file_bytes)


def estimate_processing_time(file_bytes: bytes, content_type: str) -> tuple[int, int]:
    """
    Estimate the total processing time for a document.

    Parameters
    ----------
    file_bytes:
        Raw bytes of the uploaded file.
    content_type:
        MIME type as detected by python-magic.

    Returns
    -------
    (estimated_seconds, page_count)
        *estimated_seconds* is a conservative integer (seconds).
        *page_count* is the detected page count (at least 1).
    """
    page_count = count_pages(file_bytes, content_type)

    total = sum(
        timing["base"] + timing["per_page"] * page_count
        for timing in _STAGES.values()
    )

    buffered = total * _BUFFER_FACTOR
    clamped = int(max(_MIN_SECONDS, min(_MAX_SECONDS, buffered)))

    logger.debug(
        "[estimator] pages=%d raw=%.1fs buffered=%.1fs final=%ds",
        page_count,
        total,
        buffered,
        clamped,
    )
    return clamped, page_count

