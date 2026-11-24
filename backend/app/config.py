import secrets
from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://aiteebar_user:password@localhost:5432/aiteebar_db"

    jwt_secret_key: str = secrets.token_urlsafe(48)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    cors_allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    rate_limit_login_per_minute: int = 10
    rate_limit_enroll_per_minute: int = 10
    rate_limit_scans_per_minute: int = 60

    recommended_scanner_version: str = "1.4.2"

    @field_validator("cors_allowed_origins")
    @classmethod
    def validate_origins(cls, v: str) -> str:
        if "*" in v:
            raise ValueError("Wildcard CORS origin '*' is not permitted.")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in {"development", "dev", "test"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
