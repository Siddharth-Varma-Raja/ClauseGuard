import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is explicitly loaded into os.environ
load_dotenv()

# If GOOGLE_APPLICATION_CREDENTIALS is set to a relative path, resolve to absolute path
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

    # ── GCP / Document AI & DLP ───────────────────────────────────────────────
    gcp_project_id: str = ""
    gcp_location: str = "eu"
    doc_ai_processor_id: str = ""
    gcp_processor_id: str = ""
    google_application_credentials: str = ""

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

    # ── AWS / S3 ───────────────────────────────────────────────────────────────
    aws_region: str = "eu-north-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = "clauseguard-bucket"

    # ── Firebase Web API Key (for dev token generator) ────────────────────────
    firebase_web_api_key: str = ""

    # ── Gemini API Key (for chatbot) ──────────────────────────────────────────
    gemini_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
