from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    firebase_credentials_json: str = "./firebase-service-account.json"

    database_url: str = "mysql+aiomysql://root:root@localhost:3306/clauseguard"
    database_url_sync: str = "mysql+pymysql://root:root@localhost:3306/clauseguard"

    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    rate_limit_auth: str = "10/minute"
    rate_limit_api: str = "60/minute"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
