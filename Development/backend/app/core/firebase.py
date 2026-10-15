import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials

from app.config import settings

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> None:
    global _firebase_app
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.firebase_credentials_json)
        _firebase_app = firebase_admin.initialize_app(cred)


def verify_id_token(id_token: str) -> dict:
    return firebase_auth.verify_id_token(id_token, check_revoked=True)


def revoke_refresh_tokens(firebase_uid: str) -> None:
    firebase_auth.revoke_refresh_tokens(firebase_uid)


def get_firebase_user(firebase_uid: str) -> firebase_auth.UserRecord:
    return firebase_auth.get_user(firebase_uid)


def send_password_reset_email(email: str) -> str:
    return firebase_auth.generate_password_reset_link(email)
