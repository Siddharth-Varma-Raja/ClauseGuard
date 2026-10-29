import os
import logging
from google.cloud import dlp_v2

logger = logging.getLogger(__name__)

class RedactionError(Exception):
    pass

def redact(raw_text: str) -> str:
    """
    Scrub PII from extracted text using Google Cloud DLP.
    Replaces sensitive data with tags like [PERSON_NAME] or [IRELAND_PPSN].
    """
    if not isinstance(raw_text, str):
        raise RedactionError("Input to redact() must be a string.")
        
    project_id = os.environ.get("GCP_PROJECT_ID")
    
    if not project_id:
        logger.error("Missing GCP_PROJECT_ID environment variable.")
        raise RedactionError("Server configuration error for redaction.")

    try:
        client = dlp_v2.DlpServiceClient()
        
        parent = f"projects/{project_id}"

        inspect_config = {
            "info_types": [
                {"name": "IRELAND_PPSN"},
                {"name": "IBAN_CODE"},
                {"name": "PERSON_NAME"},
                {"name": "STREET_ADDRESS"},
                {"name": "PHONE_NUMBER"},
                {"name": "EMAIL_ADDRESS"},
                {"name": "PASSPORT"}
            ]
        }

        deidentify_config = {
            "info_type_transformations": {
                "transformations": [
                    {
                        "primitive_transformation": {
                            "replace_with_info_type_config": {}
                        }
                    }
                ]
            }
        }

        response = client.deidentify_content(
            request={
                "parent": parent,
                "deidentify_config": deidentify_config,
                "inspect_config": inspect_config,
                "item": {"value": raw_text},
            }
        )
        
        return response.item.value
    except Exception as e:
        logger.exception("An unexpected error occurred during GCP DLP redaction.")
        raise RedactionError(f"Redaction failed: {str(e)}") from e