import os
import logging
from google.cloud import storage
from google.api_core.exceptions import NotFound

logger = logging.getLogger(__name__)

class GCSStorageError(Exception):
    """Raised when a Google Cloud Storage operation fails."""
    pass

from app.core.cache import lease_text_cache  # TTLCache: use .get / .set / .delete

def _get_bucket():
    """Helper to initialize the GCS client and target bucket."""
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "clauseguard-leases-prod")
    storage_client = storage.Client()
    return storage_client.bucket(bucket_name), bucket_name

def upload_text_to_gcs(text_data: str, gcs_key: str) -> str:
    """Uploads redacted lease text to GCS and populates the in-memory cache."""
    try:
        bucket, bucket_name = _get_bucket()
        blob = bucket.blob(gcs_key)
        
        blob.upload_from_string(text_data, content_type="text/plain")

        lease_text_cache.set(gcs_key, text_data)
        
        gcs_uri = f"gs://{bucket_name}/{gcs_key}"
        logger.info(f"Successfully uploaded redacted text to {gcs_uri}")
        return gcs_uri
        
    except Exception as e:
        logger.error(f"Failed to upload {gcs_key} to GCS: {str(e)}")
        raise GCSStorageError(f"Could not upload to GCS: {str(e)}") from e

def get_text_from_gcs(gcs_key: str) -> str:
    """Retrieves lease text from the in-memory cache, falling back to GCS on a cache miss."""
    cached = lease_text_cache.get(gcs_key)
    if cached is not None:
        logger.debug(f"Cache hit for {gcs_key}")
        return cached
        
    try:
        bucket, _ = _get_bucket()
        blob = bucket.blob(gcs_key)
        text_data = blob.download_as_string().decode("utf-8")

        lease_text_cache.set(gcs_key, text_data)
        return text_data
        
    except NotFound:
        logger.error(f"Blob {gcs_key} not found in GCS.")
        raise GCSStorageError(f"File {gcs_key} not found.")
    except Exception as e:
        logger.error(f"Failed to download {gcs_key} from GCS: {str(e)}")
        raise GCSStorageError(f"Could not download from GCS: {str(e)}") from e

def delete_from_gcs(gcs_key: str) -> None:
    """Idempotently deletes a file from GCS and purges it from the cache."""
    lease_text_cache.delete(gcs_key)
    
    try:
        bucket, _ = _get_bucket()
        blob = bucket.blob(gcs_key)
        
        if blob.exists():
            blob.delete()
            logger.info(f"Successfully deleted {gcs_key} from GCS.")
        else:
            logger.info(f"Idempotent delete: Blob {gcs_key} already missing from GCS.")
            
    except Exception as e:
        logger.error(f"Failed to delete {gcs_key} from GCS: {str(e)}")
        raise GCSStorageError(f"Could not delete from GCS: {str(e)}") from e