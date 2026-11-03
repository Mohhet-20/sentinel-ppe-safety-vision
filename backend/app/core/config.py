"""
Application configuration, loaded from environment variables / .env file.
Uses pydantic-settings so every value is validated and typed at startup.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_SECRET = "insecure-dev-secret-change-me"

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    APP_NAME: str = "Sentinel AI Workplace Safety Platform"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api"
    DEBUG: bool = True
    VERSION: str = "0.1.0"

    # --- Security / JWT ---
    SECRET_KEY: str = "insecure-dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./sentinel.db"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Storage ---
    UPLOAD_DIR: str = "uploads"
    REPORTS_DIR: str = "reports"
    LOG_DIR: str = "logs"
    MAX_UPLOAD_SIZE_MB: int = 50

    # --- AI model ---
    # Path is relative to the backend/ directory. Drop a fine-tuned Ultralytics
    # checkpoint at this exact path (or point MODEL_DIR/MODEL_FILENAME at a
    # different one) and the inference service will pick it up automatically
    # — no code change or restart required (auto-reload on file change).
    MODEL_DIR: str = "models"
    MODEL_FILENAME: str = "best.pt"
    MODEL_DEVICE: str = "AUTO"  # OpenVINO device string: AUTO | CPU | GPU | NPU
    MODEL_CONFIDENCE_THRESHOLD: float = 0.5
    MODEL_IOU_THRESHOLD: float = 0.45
    ALLOWED_IMAGE_EXTENSIONS: str = ".jpg,.jpeg,.png,.webp,.bmp"

    # --- Demo admin user ---
    DEMO_ADMIN_USERNAME: str = "admin"
    DEMO_ADMIN_EMAIL: str = "admin@sentinel-ai.com"
    DEMO_ADMIN_PASSWORD: str = "ChangeMe123!"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in {"production", "prod"}

    @model_validator(mode="after")
    def _enforce_production_hardening(self) -> "Settings":
        """
        Fail fast in production if security-critical settings were left at their
        insecure development defaults, rather than silently shipping a guessable
        JWT signing key or a wildcard CORS policy. Development/test envs are
        untouched so local DX and the test suite keep working as before.
        """
        if not self.is_production:
            return self

        problems: list[str] = []
        if self.SECRET_KEY == _INSECURE_SECRET or len(self.SECRET_KEY) < 32:
            problems.append("SECRET_KEY must be set to a strong random value (>=32 chars)")
        if self.DEBUG:
            problems.append("DEBUG must be False in production")
        if "*" in self.cors_origins_list:
            problems.append("CORS_ORIGINS must not contain a wildcard '*' in production")
        if self.DEMO_ADMIN_PASSWORD == "ChangeMe123!":
            problems.append("DEMO_ADMIN_PASSWORD must be changed from its default in production")

        if problems:
            raise ValueError(
                "Insecure production configuration detected:\n  - " + "\n  - ".join(problems)
            )
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def upload_path(self) -> Path:
        return BASE_DIR / self.UPLOAD_DIR

    @property
    def reports_path(self) -> Path:
        return BASE_DIR / self.REPORTS_DIR

    @property
    def log_path(self) -> Path:
        return BASE_DIR / self.LOG_DIR

    @property
    def models_path(self) -> Path:
        return BASE_DIR / self.MODEL_DIR

    @property
    def model_path(self) -> Path:
        return self.models_path / self.MODEL_FILENAME

    @property
    def allowed_image_extensions_list(self) -> list[str]:
        return [ext.strip().lower() for ext in self.ALLOWED_IMAGE_EXTENSIONS.split(",") if ext.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance — env is only parsed once per process."""
    return Settings()


settings = get_settings()
