from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    firebase_credentials_json: str = "./firebase-service-account.json"

    database_url: str = "mysql+aiomysql://root:root@localhost:3306/clauseguard"
    database_url_sync: str = "mysql+pymysql://root:root@localhost:3306/clauseguard"

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    rate_limit_auth: str = "10/minute"
    rate_limit_api: str = "60/minute"

    # ── AWS / S3 ───────────────────────────────────────────────────────────────
    aws_region: str = "eu-north-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = "clauseguard-bucket"

    # ── Firebase Web API Key (for dev token generator) ────────────────────────
    firebase_web_api_key: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
