import os
import logging
from google.cloud import storage

logger = logging.getLogger(__name__)

def delete_from_gcs(gcs_key: str) -> None:
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