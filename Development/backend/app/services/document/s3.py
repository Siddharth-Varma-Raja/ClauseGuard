"""
S3 Storage Service
==================
Thin async wrapper around boto3's S3 client.
All AWS-specific details are confined here so the rest of the app
never imports boto3 directly.
"""

import io
import logging

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings

logger = logging.getLogger(__name__)


class S3UploadError(Exception):
    """Raised when an upload to S3 fails."""


class S3DownloadError(Exception):
    """Raised when a download from S3 fails."""


class S3DeleteError(Exception):
    """Raised when deleting from S3 fails."""


def _client():
    """Return a configured S3 client (created per-call; boto3 handles pooling)."""
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )


def upload_text_to_s3(text: str, object_key: str) -> str:
    """
    Upload a UTF-8 string to S3 as a ``.txt`` object.

    Parameters
    ----------
    text:
        The content to store.
    object_key:
        The S3 key (path) for the object, e.g. ``"leases/abc123.txt"``.

    Returns
    -------
    str
        The full S3 URI: ``s3://<bucket>/<object_key>``.

    Raises
    ------
    S3UploadError
        On any AWS or network failure.
    """
    bucket = settings.s3_bucket_name
    try:
        s3 = _client()
        s3.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=text.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
        )
        s3_uri = f"s3://{bucket}/{object_key}"
        logger.info("Uploaded object to S3: %s", s3_uri)
        return s3_uri
    except (BotoCoreError, ClientError) as exc:
        logger.exception("S3 upload failed for key '%s'.", object_key)
        raise S3UploadError(f"Failed to upload '{object_key}' to S3.") from exc


def download_text_from_s3(object_key: str) -> str:
    """
    Download a text object from S3 and return its content as a string.

    Parameters
    ----------
    object_key:
        The S3 key of the object to retrieve.

    Returns
    -------
    str
        UTF-8 decoded content of the S3 object.

    Raises
    ------
    S3DownloadError
        On any AWS or network failure.
    """
    bucket = settings.s3_bucket_name
    try:
        s3 = _client()
        response = s3.get_object(Bucket=bucket, Key=object_key)
        content = response["Body"].read().decode("utf-8")
        logger.info("Downloaded object from S3: s3://%s/%s", bucket, object_key)
        return content
    except (BotoCoreError, ClientError) as exc:
        logger.exception("S3 download failed for key '%s'.", object_key)
        raise S3DownloadError(f"Failed to download '{object_key}' from S3.") from exc


def delete_from_s3(object_key: str) -> None:
    """
    Permanently delete an object from S3.
    Used for GDPR compliance when an analysis is deleted.
    """
    bucket = settings.s3_bucket_name
    try:
        s3 = _client()
        s3.delete_object(Bucket=bucket, Key=object_key)
        logger.info("Deleted object from S3: s3://%s/%s", bucket, object_key)
    except (BotoCoreError, ClientError) as exc:
        logger.exception("S3 deletion failed for key '%s'.", object_key)
        raise S3DeleteError(f"Failed to delete '{object_key}' from S3.") from exc