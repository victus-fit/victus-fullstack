from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Victus WebApp"
    app_env: Literal["development", "test", "production"] = "development"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://victus:victus@postgres:5432/victus_app"

    frontend_origin: str = "http://localhost:5173"
    cors_allow_origins: str = "http://localhost:5173"

    secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    access_cookie_name: str = "victus_access"
    refresh_cookie_name: str = "victus_refresh"
    csrf_cookie_name: str = "victus_csrf"
    cookie_domain: str | None = None
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None

    demo_user_email: str = "demo@victus.health"
    demo_user_password: str = "victus-demo-2026"
    demo_user_display_name: str = "Mateo Vargas"

    enable_db_create_all: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @property
    def google_auth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)


@lru_cache
def get_settings() -> Settings:
    return Settings()
