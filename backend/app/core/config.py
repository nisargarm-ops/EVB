import os
from typing import List, Union
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEV_DEFAULT_SECRET = "insecure-dev-secret-key-change-in-production-bp360-jwt"

class Settings(BaseSettings):
    PROJECT_NAME: str = "BatteryPass 360"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    # Security & JWT
    SECRET_KEY: str = INSECURE_DEV_DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours (hardened from 7 days)
    
    # Development controls (strictly disabled in production)
    ENABLE_DEV_ROLE_SWITCHING: bool = False
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
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

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ENVIRONMENT.lower() == "production":
            if self.SECRET_KEY == INSECURE_DEV_DEFAULT_SECRET or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Production deployment requires a secure, "
                    "random SECRET_KEY of at least 32 characters. Do not use the default dev secret."
                )
            if self.ENABLE_DEV_ROLE_SWITCHING:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: ENABLE_DEV_ROLE_SWITCHING must be False in production."
                )
            if "*" in self.CORS_ORIGINS:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Wildcard '*' CORS origin is forbidden in production."
                )
        return self

settings = Settings()
