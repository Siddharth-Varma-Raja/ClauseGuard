import os
import logging
import json
from google.cloud import documentai
from google.api_core.client_options import ClientOptions
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

gemini_client = genai.Client()

# ── Supported MIME types ──────────────────────────────────────────────────────

IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/bmp",
}

PDF_MIME_TYPES = {"application/pdf"}

ALL_SUPPORTED_MIME_TYPES = PDF_MIME_TYPES | IMAGE_MIME_TYPES

# ── Public API ────────────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, content_type: str) -> str:
    """
    Unified entry point — sends the file to Google Cloud Document AI.
    Document AI natively handles both PDFs and images.

    Parameters
    ----------
    file_bytes:
        Raw bytes of the uploaded file.
    content_type:
        MIME type reported by the upload (e.g. "application/pdf" or "image/jpeg").

    Returns
    -------
    str
        Full extracted text.
    """
    if content_type not in ALL_SUPPORTED_MIME_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")

    project_id = os.environ.get("GCP_PROJECT_ID")
    location = os.environ.get("GCP_LOCATION", "eu")
    processor_id = os.environ.get("DOC_AI_PROCESSOR_ID") or os.environ.get("GCP_PROCESSOR_ID")

    if not all([project_id, location, processor_id]):
        logger.error(
            "Missing Document AI env vars: GCP_PROJECT_ID=%s, GCP_LOCATION=%s, processor_id=%s",
            project_id,
            location,
            processor_id,
        )
        raise ValueError("Server configuration error for document extraction.")

    logger.info("Sending document to GCP Document AI (Content-Type: %s)", content_type)

    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    client = documentai.DocumentProcessorServiceClient(client_options=opts)

    name = client.processor_path(project_id, location, processor_id)

    raw_document = documentai.RawDocument(content=file_bytes, mime_type=content_type)
    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    
    try:
        result = client.process_document(request=request)
    except Exception as exc:
        logger.exception("Document AI extraction failed: %s", exc)
        raise ValueError("Failed to extract text from the document.") from exc

    text = result.document.text
    
    if not text or not text.strip():
        raise ValueError("Google Cloud Document AI could not extract any text.")

    return text.strip()

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
    
    response = gemini_client.models.generate_content(
        model='gemini-2.5-flash',
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