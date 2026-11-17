import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
    _cred_path = Path(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])
    if not _cred_path.is_absolute():
        _backend_dir = Path(__file__).resolve().parent.parent
        _resolved = _backend_dir / _cred_path
        if _resolved.exists():
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(_resolved)

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    firebase_credentials_json: str = "./firebase-service-account.json"
    # Firebase Auth may live in a different GCP project than Cloud SQL /
    # Document AI. Used when no key file is present (Cloud Run).
    firebase_project_id: str = ""

    # ── GCP / Document AI & DLP ───────────────────────────────────────────────
    gcp_project_id: str = ""
    gcp_location: str = "eu"
    doc_ai_processor_id: str = ""
    gcp_processor_id: str = ""
    google_application_credentials: str = ""
    
    # ── GCP / Storage ─────────────────────────────────────────────────────────
    gcs_bucket_name: str = "clauseguard-leases-prod"

    database_url: str = "mysql+aiomysql://root:root@localhost:3306/clauseguard"
    database_url_sync: str = "mysql+pymysql://root:root@localhost:3306/clauseguard"

    allowed_origins: str = (
        "http://localhost:5173,"
        "http://localhost:3000,"
        "https://clause-guard-ten-chi.vercel.app,"
        "https://www.clauseguard.ie,"
        "https://clauseguard.ie"
    )

    rate_limit_auth: str = "10/minute"
    rate_limit_api: str = "60/minute"

    # ── Load balancer / proxy trust ───────────────────────────────────────────
    # Number of trusted proxies that APPEND to X-Forwarded-For in front of the
    # app. Behind the Google external Application Load Balancer this is 1
    # (the LB appends "<client-ip>,<lb-ip>"). Keep 0 for local development so
    # the header is ignored and cannot be spoofed.
    trusted_proxy_count: int = 0

    # ── Firebase Web API Key (for dev token generator) ────────────────────────
    firebase_web_api_key: str = ""

    # ── Gemini API Key (for chatbot) ──────────────────────────────────────────
    gemini_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
