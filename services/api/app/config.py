"""Runtime configuration loaded from the environment (see .env.example)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://animal_chess:animal_chess@localhost:5432/animal_chess"
    redis_url: str = "redis://localhost:6379/0"

    # Shared with apps/web — the NextAuth v4 session JWT is decoded with this.
    nextauth_secret: str = "dev-insecure-secret-change-me"
    # Shared with apps/web — guards the internal Node->Python GraphQL mutations.
    internal_sync_secret: str = "dev-internal-secret-change-me"

    web_origin: str = "http://localhost:3000"
    node_snapshot_url: str = "http://localhost:3000/internal/rooms/snapshot"

    port: int = 8000
    environment: str = "development"
    # IANA timezone for daily reset boundaries (login bonus, daily quests).
    daily_tz: str = "Asia/Ho_Chi_Minh"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.web_origin.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
