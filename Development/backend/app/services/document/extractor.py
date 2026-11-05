import os
import io
import json
import logging
import docx
from google.cloud import documentai
from google.cloud import storage
from google.api_core.client_options import ClientOptions
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

_gemini_client = None

def get_gemini_client() -> genai.Client:
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = genai.Client()
    return _gemini_client

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

def extract_text_large_document(file_bytes: bytes, content_type: str, file_name: str) -> str:
    """Handles PDFs and images using GCS and asynchronous batch processing to bypass page limits."""
    project_id = os.environ.get("GCP_PROJECT_ID")
    location = os.environ.get("GCP_LOCATION", "eu")
    processor_id = os.environ.get("DOC_AI_PROCESSOR_ID") or os.environ.get("GCP_PROCESSOR_ID")
    input_bucket = os.environ.get("GCS_INPUT_BUCKET", "clauseguard-docs-in")
    output_bucket = os.environ.get("GCS_OUTPUT_BUCKET", "clauseguard-docs-out")

    if not all([project_id, location, processor_id]):
        raise ValueError("Server configuration error for document extraction.")

    storage_client = storage.Client()
    in_bucket = storage_client.bucket(input_bucket)
    blob = in_bucket.blob(file_name)
    blob.upload_from_string(file_bytes, content_type=content_type)
    
    gcs_input_uri = f"gs://{input_bucket}/{file_name}"
    gcs_output_uri = f"gs://{output_bucket}/{file_name}-output/"

    opts = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
    docai_client = documentai.DocumentProcessorServiceClient(client_options=opts)
    name = docai_client.processor_path(project_id, location, processor_id)

    input_config = documentai.BatchDocumentsInputConfig(
        gcs_documents=documentai.GcsDocuments(
            documents=[documentai.GcsDocument(gcs_uri=gcs_input_uri, mime_type=content_type)]
        )
    )
    output_config = documentai.DocumentOutputConfig(
        gcs_output_config=documentai.DocumentOutputConfig.GcsOutputConfig(gcs_uri=gcs_output_uri)
    )

    request = documentai.BatchProcessRequest(
        name=name,
        input_documents=input_config,
        document_output_config=output_config,
    )

    operation = docai_client.batch_process_documents(request)
    operation.result(timeout=400) 

    out_bucket = storage_client.bucket(output_bucket)
    blob_list = list(out_bucket.list_blobs(prefix=f"{file_name}-output/"))
    
    full_text = ""
    for output_blob in blob_list:
        if output_blob.name.endswith(".json"):
            json_string = output_blob.download_as_bytes().decode("utf-8")
            document = documentai.Document.from_json(json_string)
            full_text += document.text

    blob.delete()
    for output_blob in blob_list:
        output_blob.delete()

    text = full_text.strip()
    if not text:
        raise ValueError("Google Cloud Document AI could not extract any text.")
        
    return text

# ── Public API ────────────────────────────────────────────────────────────────

def extract_text(file_bytes: bytes, content_type: str, file_name: str = "upload.bin") -> str:
    """
    Unified entry point. Routes Word documents to the local parser, 
    and PDFs/Images to the GCS batch processor.
    """
    if content_type not in ALL_SUPPORTED_MIME_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")
        
    if content_type in DOCX_MIME_TYPES:
        logger.info("Extracting DOCX file locally.")
        return extract_docx_text(file_bytes)
        
    logger.info("Sending document to GCP Document AI Batch Process (Content-Type: %s)", content_type)
    return extract_text_large_document(file_bytes, content_type, file_name)

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
    
    client = get_gemini_client()
    response = client.models.generate_content(
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