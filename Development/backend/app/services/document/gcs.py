import os
import logging
from google.cloud import storage

logger = logging.getLogger(__name__)

class GCSUploadError(Exception):
    """Raised when an upload to Google Cloud Storage fails."""
    pass

def upload_text_to_gcs(text_data: str, gcs_key: str) -> str:
    """Uploads string text directly to a GCS bucket and returns the URI."""
    bucket_name = os.environ.get("GCS_INPUT_BUCKET", "clauseguard-docs-in")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_key)
        
        blob.upload_from_string(text_data, content_type="text/plain")
        
        gcs_uri = f"gs://{bucket_name}/{gcs_key}"
        logger.info(f"Successfully uploaded to {gcs_uri}")
        return gcs_uri
        
    except Exception as e:
        logger.error(f"Failed to upload {gcs_key} to GCS: {str(e)}")
        raise GCSUploadError(f"Could not upload to GCS: {str(e)}") from e

def delete_from_gcs(gcs_key: str) -> None:
    """Deletes a file from the Google Cloud Storage bucket."""
    bucket_name = os.environ.get("GCS_INPUT_BUCKET", "clauseguard-docs-in")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(gcs_key)
        
        if blob.exists():
            blob.delete()
            logger.info(f"Successfully deleted {gcs_key} from GCS.")
        else:
            logger.warning(f"Blob {gcs_key} not found in GCS for deletion.")
    except Exception as e:
        logger.error(f"Failed to delete {gcs_key} from GCS: {str(e)}")
        raise