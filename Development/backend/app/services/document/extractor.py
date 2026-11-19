import os
import io
import re
import json
import time
import uuid
import random
import logging
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache

import docx
import pypdf
from google.cloud import documentai
from google.cloud import storage
from google.api_core import exceptions as gexc
from google.api_core.client_options import ClientOptions
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ── PDF extraction tunables ───────────────────────────────────────────────────
# A page with less text than this is treated as scanned and sent to OCR.
MIN_TEXT_CHARS = 50
# A page that contains an image and less text than this is also treated as
# scanned: catches scans that carry only a typed header, footer or stamp.
SCAN_TEXT_CHARS = 1000
# Document AI online (synchronous) OCR accepts at most 15 pages per request.
OCR_CHUNK_PAGES = 15
# Parallel OCR requests per upload.
OCR_WORKERS = 4
# Attempts per OCR request on quota / transient errors (exponential backoff).
OCR_MAX_ATTEMPTS = 5
_RETRYABLE = (
    gexc.ResourceExhausted,
    gexc.TooManyRequests,
    gexc.ServiceUnavailable,
    gexc.DeadlineExceeded,
    gexc.InternalServerError,
)


def _report_plan(on_plan, pages: int, ocr_pages: int) -> None:
    """Tell the caller how much work extraction involves (for time estimates). Never fails the upload."""
    if on_plan is None:
        return
    try:
        on_plan(pages, ocr_pages)
    except Exception:
        logger.exception("Extraction plan callback failed.")


class PdfPasswordError(ValueError):
    """The PDF needs a password to open, so its text cannot be read."""

@lru_cache(maxsize=1)
def _gemini_client() -> genai.Client:
    """Created on first use, so importing this module never needs an API key."""
    return genai.Client()

# ── Supported MIME types ──────────────────────────────────────────────────────

IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}

PDF_MIME_TYPES = {"application/pdf"}
DOCX_MIME_TYPES = {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}

ALL_SUPPORTED_MIME_TYPES = PDF_MIME_TYPES | IMAGE_MIME_TYPES | DOCX_MIME_TYPES

# ── Extraction Functions ──────────────────────────────────────────────────────

def extract_docx_text(file_bytes: bytes) -> str:
    """Instantly parses text from a Word document locally without hitting GCP."""
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([paragraph.text for paragraph in doc.paragraphs])

# ── Document AI (OCR) ─────────────────────────────────────────────────────────

def _docai_settings() -> tuple[str, str, str]:
    project_id = os.environ.get("GCP_PROJECT_ID")
    location = os.environ.get("GCP_LOCATION", "eu")
    processor_id = os.environ.get("DOC_AI_PROCESSOR_ID") or os.environ.get("GCP_PROCESSOR_ID")
    if not all([project_id, location, processor_id]):
        raise ValueError("Server configuration error for document extraction.")
    return project_id, location, processor_id


@lru_cache(maxsize=4)
def _docai_client(location: str) -> documentai.DocumentProcessorServiceClient:
    """One shared client per location; safe to use from several threads."""
    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    return documentai.DocumentProcessorServiceClient(client_options=opts)


def _process_online(content: bytes, mime_type: str) -> documentai.Document:
    """
    One synchronous OCR request (max 15 pages). Retries quota and transient
    errors with exponential backoff and jitter, so a burst of uploads queues
    for a while instead of failing on the first "quota exceeded".
    """
    project_id, location, processor_id = _docai_settings()
    client = _docai_client(location)
    request = documentai.ProcessRequest(
        name=client.processor_path(project_id, location, processor_id),
        raw_document=documentai.RawDocument(content=content, mime_type=mime_type),
    )
    for attempt in range(1, OCR_MAX_ATTEMPTS + 1):
        try:
            return client.process_document(request=request, timeout=120).document
        except _RETRYABLE as exc:
            if attempt == OCR_MAX_ATTEMPTS:
                raise
            delay = min(2 ** attempt, 16) + random.uniform(0, 1)
            logger.warning("OCR attempt %d failed (%s); retrying in %.1fs.", attempt, type(exc).__name__, delay)
            time.sleep(delay)


def _page_texts(document: documentai.Document) -> list[str]:
    """Split a Document AI result back into one string per page."""
    pages = []
    for page in document.pages:
        segments = page.layout.text_anchor.text_segments
        pages.append("".join(document.text[int(s.start_index):int(s.end_index)] for s in segments).strip())
    return pages


def extract_text_sync(file_bytes: bytes, content_type: str) -> str:
    """Synchronous OCR of a whole file (images; PDFs of 15 pages or fewer)."""
    return _process_online(file_bytes, content_type).text.strip()


def ocr_pdf_pages(reader: pypdf.PdfReader, page_indexes: list[int]) -> dict[int, str]:
    """
    OCR the given pages of a PDF: chunks of up to 15 pages, several chunks in
    parallel. Returns {page_index: text}.
    """
    chunks = [page_indexes[i:i + OCR_CHUNK_PAGES] for i in range(0, len(page_indexes), OCR_CHUNK_PAGES)]

    def run(chunk: list[int]) -> dict[int, str]:
        writer = pypdf.PdfWriter()
        for i in chunk:
            writer.add_page(reader.pages[i])
        buf = io.BytesIO()
        writer.write(buf)
        texts = _page_texts(_process_online(buf.getvalue(), "application/pdf"))
        if len(texts) != len(chunk):
            # Should not happen; keep the text rather than lose it.
            logger.warning("OCR returned %d pages for a %d-page chunk.", len(texts), len(chunk))
            return {chunk[0]: "\n".join(texts)}
        return dict(zip(chunk, texts))

    results: dict[int, str] = {}
    with ThreadPoolExecutor(max_workers=min(OCR_WORKERS, len(chunks))) as pool:
        for part in pool.map(run, chunks):
            results.update(part)
    return results


def extract_text_large_document(file_bytes: bytes, content_type: str, file_name: str) -> str:
    """
    Batch OCR through the staging buckets. Slow (about 80 s for 30 pages), so it
    is only the fallback for PDFs that pypdf cannot open. `file_name` must be
    unique per call. Staging files are always deleted, even on failure.
    """
    project_id, location, processor_id = _docai_settings()
    input_bucket = os.environ.get("GCS_INPUT_BUCKET", "clauseguard-docs-in")
    output_bucket = os.environ.get("GCS_OUTPUT_BUCKET", "clauseguard-docs-out")

    storage_client = storage.Client()
    blob = storage_client.bucket(input_bucket).blob(file_name)
    out_bucket = storage_client.bucket(output_bucket)
    output_prefix = f"{file_name}-output/"

    try:
        blob.upload_from_string(file_bytes, content_type=content_type)
        docai_client = _docai_client(location)
        request = documentai.BatchProcessRequest(
            name=docai_client.processor_path(project_id, location, processor_id),
            input_documents=documentai.BatchDocumentsInputConfig(
                gcs_documents=documentai.GcsDocuments(
                    documents=[documentai.GcsDocument(gcs_uri=f"gs://{input_bucket}/{file_name}", mime_type=content_type)]
                )
            ),
            document_output_config=documentai.DocumentOutputConfig(
                gcs_output_config=documentai.DocumentOutputConfig.GcsOutputConfig(
                    gcs_uri=f"gs://{output_bucket}/{output_prefix}"
                )
            ),
        )
        docai_client.batch_process_documents(request).result(timeout=400)

        full_text = ""
        for output_blob in out_bucket.list_blobs(prefix=output_prefix):
            if output_blob.name.endswith(".json"):
                document = documentai.Document.from_json(output_blob.download_as_bytes().decode("utf-8"))
                full_text += document.text
    finally:
        # The input is the raw, unredacted upload: never leave it behind.
        for leftover in [blob, *out_bucket.list_blobs(prefix=output_prefix)]:
            try:
                leftover.delete()
            except gexc.NotFound:
                pass
            except Exception:
                logger.exception("Could not delete staging object %s", leftover.name)

    text = full_text.strip()
    if not text:
        raise ValueError("Google Cloud Document AI could not extract any text.")
    return text


# ── PDF: text layer first, OCR only where needed ──────────────────────────────

def _tidy(text: str) -> str:
    """Layout mode pads lines with spaces; squeeze them but keep the line breaks."""
    return "\n".join(re.sub(r"[ \t]{2,}", " ", line).strip() for line in text.splitlines()).strip()


def _has_images(page: pypdf.PageObject) -> bool:
    try:
        return len(page.images) > 0
    except Exception:
        return False


def _field_values(page: pypdf.PageObject) -> list[str]:
    """
    Text shown on the page that is not in its content stream: filled form
    fields and free-text annotations (e.g. a typed-in rent or tenant name on a
    fillable lease). pypdf's text extraction skips these.
    """
    values = []
    try:
        for ref in page.get("/Annots") or []:
            annot = ref.get_object()
            subtype = annot.get("/Subtype")
            if subtype == "/FreeText":
                value = annot.get("/Contents")
            elif subtype == "/Widget":
                value = annot.get("/V")
                if value is None and annot.get("/Parent") is not None:
                    value = annot["/Parent"].get_object().get("/V")
            else:
                continue
            # Text values only; checkbox states are names such as "/Yes" or "/Off".
            if isinstance(value, str) and value.strip() and not value.startswith("/"):
                values.append(value.strip())
    except Exception:
        pass
    return values


def _page_needs_ocr(page: pypdf.PageObject, text: str, fields: list[str]) -> bool:
    if len(text) < MIN_TEXT_CHARS:
        return True
    if len(text) < SCAN_TEXT_CHARS and _has_images(page):
        return True
    # Filled fields: OCR reads them in place, as rendered on the page.
    return bool(fields)


def _open_pdf(file_bytes: bytes) -> pypdf.PdfReader:
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    if reader.is_encrypted:
        # Many PDFs are "encrypted" only to restrict printing/editing and open
        # with an empty password; only a real open-password blocks us.
        try:
            opened = reader.decrypt("")
        except Exception:
            opened = pypdf.PasswordType.NOT_DECRYPTED
        if opened == pypdf.PasswordType.NOT_DECRYPTED:
            raise PdfPasswordError(
                "This PDF is password-protected. Please remove the password and upload it again."
            )
    return reader


def _ocr_unreadable_pdf(file_bytes: bytes) -> str:
    """
    pypdf could not open the file. One synchronous OCR call answers in seconds:
    it reads files of up to 15 pages, and only a "too many pages" error is worth
    the slow batch path. Anything else means the file is damaged, so fail fast
    (a damaged file took 74 s to fail in batch).
    """
    try:
        text = extract_text_sync(file_bytes, "application/pdf")
    except gexc.InvalidArgument as exc:
        if "PAGE_LIMIT_EXCEEDED" in str(exc) or "exceed the limit" in str(exc):
            return extract_text_large_document(file_bytes, "application/pdf", f"fallback-{uuid.uuid4()}.pdf")
        raise ValueError(
            "This PDF appears to be damaged and could not be read. Please re-export it and upload it again."
        ) from exc
    if not text:
        raise ValueError("No text could be extracted from this PDF.")
    return text


def extract_pdf_text(file_bytes: bytes, on_plan=None) -> str:
    """
    Read each page's own text (fast, local). Only pages that look scanned, or
    that hold filled-in form fields, go to OCR. Pages are joined with a form
    feed ("\\f") so the analysis knows where each page starts.

    ``on_plan(pages, ocr_pages)`` is called once the OCR pages are known.
    """
    started = time.perf_counter()
    try:
        reader = _open_pdf(file_bytes)
        texts, fields = [], []
        for page in reader.pages:
            try:
                texts.append(_tidy(page.extract_text(extraction_mode="layout") or ""))
            except Exception:
                texts.append("")  # unreadable page: OCR it below
            fields.append(_field_values(page))
        needs_ocr = [i for i, page in enumerate(reader.pages) if _page_needs_ocr(page, texts[i], fields[i])]
    except PdfPasswordError:
        raise
    except Exception as exc:
        logger.warning("pypdf could not read the PDF (%s); trying OCR on the whole file.", exc)
        return _ocr_unreadable_pdf(file_bytes)

    _report_plan(on_plan, len(texts), len(needs_ocr))
    if needs_ocr:
        ocr_text = ocr_pdf_pages(reader, needs_ocr)
        for i in needs_ocr:
            texts[i] = ocr_text.get(i, "")
    for i, values in enumerate(fields):
        # Safety net: a field with no visible appearance is invisible to OCR.
        missing = [v for v in values if v not in texts[i]]
        if missing:
            texts[i] = (texts[i] + "\n" + "\n".join(missing)).strip()

    logger.info(
        "PDF extracted: %d pages, %d from the text layer, %d by OCR, %.2fs.",
        len(texts), len(texts) - len(needs_ocr), len(needs_ocr), time.perf_counter() - started,
    )
    text = "\f".join(texts).strip()
    if not text.replace("\f", "").strip():
        raise ValueError("No text could be extracted from this PDF.")
    return text


# ── Public API ────────────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, content_type: str, file_name: str = "upload.bin", on_plan=None) -> str:
    """
    Route a file to the fastest extractor that can read it:
    - DOCX: local python-docx parser.
    - PDF: text layer first; scanned pages by parallel synchronous OCR.
    - Images: synchronous OCR.
    `file_name` is kept for backwards compatibility and is no longer used.
    ``on_plan(pages, ocr_pages)`` reports how much OCR is needed, for time estimates.
    """
    if content_type not in ALL_SUPPORTED_MIME_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")

    if content_type in DOCX_MIME_TYPES:
        logger.info("Extracting DOCX file locally.")
        return extract_docx_text(file_bytes)

    if content_type in IMAGE_MIME_TYPES:
        logger.info("Extracting image synchronously.")
        _report_plan(on_plan, 1, 1)
        return extract_text_sync(file_bytes, content_type)

    return extract_pdf_text(file_bytes, on_plan=on_plan)

def extract_lease_metadata(raw_unredacted_text: str) -> dict:
    """
    Extracts critical lease fields strictly before DLP masking.
    Converts financial values to cents to avoid floating point errors.
    """
    prompt = f"""
    Extract the following data from this Irish rental lease. 
    Return ONLY a JSON object. If a value is missing, return null.
    
    Keys to return:
    - monthly_rent_cents (integer, convert rent to cents)
    - deposit_cents (integer, convert deposit to cents)
    - tenancy_start (ISO 8601 date string)
    - term_months (integer, duration of lease in months)
    
    Lease Text:
    {raw_unredacted_text[:8000]}
    """
    
    response = _gemini_client().models.generate_content(
        model='gemini-3.8-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1
        ),
    )
    
    try:
        return json.loads(response.text)
    except Exception:
        return {
            "monthly_rent_cents": None,
            "deposit_cents": None,
            "tenancy_start": None,
            "term_months": None
        }