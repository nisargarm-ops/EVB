from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

    PROJECT_NAME: str = 'BatteryPass 360'
    VERSION: str = '1.0.0'
    API_V1_STR: str = '/api/v1'
    ENVIRONMENT: str = 'development'
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = 'batterypass360-insecure-development-secret-key-replace-me-1234567890'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = 'http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000'

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(',') if o.strip()]

    # Database
    USE_MEMORY_DB: bool = True
    SUPABASE_URL: str = ''
    SUPABASE_KEY: str = ''
    SUPABASE_SERVICE_ROLE_KEY: str = ''

    # QpiAI Integrations
    QPIAI_OPT_URL: str = 'https://opt.qpiai.tech/api/v1'
    QPIAI_OPT_API_KEY: str = ''

    QPIAI_QUANTUM_API_KEY: str = ''
    QPIAI_QUANTUM_BACKEND: str = 'QpiAI-QSV-Local'

settings = Settings()
