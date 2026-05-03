"""
Kartify Backend Configuration
Loads all environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Upstash Redis
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str

    @property
    def redis_url(self) -> str:
        return self.UPSTASH_REDIS_REST_URL

    @property
    def redis_token(self) -> str:
        return self.UPSTASH_REDIS_REST_TOKEN

    # QuickCommerce API (legacy — now using custom scrapers)
    QUICKCOMMERCE_API_KEY: str = ""
    QUICKCOMMERCE_BASE_URL: str = ""
    QUICKCOMMERCE_DEFAULT_LAT: float = 28.4595
    QUICKCOMMERCE_DEFAULT_LON: float = 77.0266
    QUICKCOMMERCE_PLATFORMS: str = "BlinkIt,Zepto"
    QUICKCOMMERCE_PINCODE: str | None = None
    QUICKCOMMERCE_TIMEOUT_SECONDS: float = 20.0
    ENABLE_MOCK_SEARCH_FALLBACK: bool = True

    # Proxy for scrapers (optional — needed in production)
    PROXY_URL: str | None = None

    @property
    def quickcommerce_platforms(self) -> list[str]:
        return [p.strip() for p in self.QUICKCOMMERCE_PLATFORMS.split(",") if p.strip()]

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    # Public share links
    KARTIFY_SHARE_URL_BASE: str = "kartify://shared-cart"
    KARTIFY_SHARE_TOKEN_TTL_HOURS: int = 72

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
