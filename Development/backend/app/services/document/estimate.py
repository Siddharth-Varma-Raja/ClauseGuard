"""
Remaining-time estimates for the upload pipeline.

Each constant is calibrated from measured runs (Nov 2026): a 31-page text PDF
(text layer 0.2 s, DLP 1.0-1.4 s for ~118k characters), a 31-page scan (OCR in
chunks of 15/15/1 pages, 10.4 s), a 3-page scan (3.3 s), and production uploads
on Cloud Run (1.6-3.0 s end to end). The upload log prints each estimate next
to the real time so these can be re-tuned.
"""
import math

from app.services.document.extractor import OCR_CHUNK_PAGES, OCR_WORKERS

TEXT_LAYER_SECONDS_PER_PAGE = 0.007
OCR_REQUEST_SECONDS = 2.5           # fixed cost of one Document AI request
OCR_SECONDS_PER_PAGE = 0.5          # plus this per page in the request
CHARS_PER_PAGE = 3_800              # typical lease page, used before the text is known
LEASE_CHECK_SECONDS = 0.05
REDACT_BASE_SECONDS = 0.6           # one DLP request
REDACT_SECONDS_PER_CHAR = 1 / 150_000
STORE_SECONDS = 0.3                 # write redacted text to Cloud Storage
ANALYSE_SECONDS = 0.5               # rules engine + batched database save


def ocr_seconds(pages: int) -> float:
    """OCR time for `pages` pages: chunks of 15 run 4 at a time, so time grows in waves."""
    if pages <= 0:
        return 0.0
    chunks = math.ceil(pages / OCR_CHUNK_PAGES)
    waves = math.ceil(chunks / OCR_WORKERS)
    largest_chunk = min(pages, OCR_CHUNK_PAGES)
    return waves * (OCR_REQUEST_SECONDS + OCR_SECONDS_PER_PAGE * largest_chunk)


def redact_seconds(chars: int) -> float:
    return REDACT_BASE_SECONDS + chars * REDACT_SECONDS_PER_CHAR


def after_redact_seconds() -> float:
    return STORE_SECONDS + ANALYSE_SECONDS


def after_extract_seconds(chars: int) -> float:
    """Everything left once the text is known: lease check, redaction, storage, analysis."""
    return LEASE_CHECK_SECONDS + redact_seconds(chars) + after_redact_seconds()


def from_extraction_plan(pages: int, ocr_pages: int) -> float:
    """Remaining time once the extractor knows how many pages need OCR."""
    text_pages = max(pages - ocr_pages, 0)
    return (
        ocr_seconds(ocr_pages)
        + text_pages * TEXT_LAYER_SECONDS_PER_PAGE
        + after_extract_seconds(pages * CHARS_PER_PAGE)
    )
