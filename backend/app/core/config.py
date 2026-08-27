import os
from functools import lru_cache


class Settings:
    PROJECT_NAME: str = "Litigant"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./litigant.db")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    MIN_VIABLE_RECOVERY_INR: float = float(os.getenv("MIN_VIABLE_RECOVERY_INR", "50"))


@lru_cache
def get_settings() -> Settings:
    return Settings()