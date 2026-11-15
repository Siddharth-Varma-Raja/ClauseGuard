import hashlib
import os
import time

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import settings
from app.core.cache import token_cache

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> None:
    """
    Use the service-account key file when one is present (local development);
    otherwise fall back to Application Default Credentials, i.e. the Cloud Run
    runtime service account — no key file needed in production.
    """
    global _firebase_app
    if firebase_admin._apps:
        return
    key_path = settings.firebase_credentials_json
    if key_path and os.path.isfile(key_path):
        cred = credentials.Certificate(key_path)
        _firebase_app = firebase_admin.initialize_app(cred)
    else:
        project = settings.firebase_project_id or settings.gcp_project_id
        options = {"projectId": project} if project else None
        _firebase_app = firebase_admin.initialize_app(credentials.ApplicationDefault(), options)


def verify_id_token(id_token: str) -> dict:
    """
    Verify a Firebase ID token, including the revocation check.

    ``check_revoked=True`` makes a network call to Firebase, so successful
    results are cached briefly (never beyond the token's own expiry).
    Failures are never cached.
    """
    key = hashlib.sha256(id_token.encode("utf-8")).hexdigest()
    cached = token_cache.get(key)
    if cached is not None:
        return cached

    decoded = firebase_auth.verify_id_token(id_token, check_revoked=True)
    seconds_left = float(decoded.get("exp", 0)) - time.time()
    token_cache.set(key, decoded, ttl=seconds_left)
    return decoded


def revoke_refresh_tokens(firebase_uid: str) -> None:
    firebase_auth.revoke_refresh_tokens(firebase_uid)
    # Make logout / account deletion take effect immediately on this instance.
    token_cache.delete_where(lambda claims: claims.get("uid") == firebase_uid)


def get_firebase_user(firebase_uid: str) -> firebase_auth.UserRecord:
    return firebase_auth.get_user(firebase_uid)


def send_password_reset_email(email: str) -> str:
    return firebase_auth.generate_password_reset_link(email)
