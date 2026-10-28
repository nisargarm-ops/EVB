from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "BatteryPass 360"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "insecure-dev-secret-key-change-in-production-bp360-jwt"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Supabase Persistence
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    USE_MEMORY_DB: bool = True  # Automatically falls back to thread-safe memory DB if credentials absent
    
    # QpiAI Integrations (Teammate 4 modules)
    QPIAI_OPT_API_KEY: str = ""
    QPIAI_OPT_URL: str = "https://opt.qpiai.tech/api/v1"
    QPIAI_QUANTUM_API_KEY: str = ""
    QPIAI_QUANTUM_BACKEND: str = "QpiAI-QSV-Local"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
