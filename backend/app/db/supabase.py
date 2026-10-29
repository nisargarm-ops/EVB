import logging
from typing import Optional
from ..core.config import settings
from .repository import BaseBatteryRepository
from .memory_repo import InMemoryBatteryRepository
from .supabase_repo import SupabaseBatteryRepository

logger = logging.getLogger("batterypass.db")

_memory_repo_instance: Optional[InMemoryBatteryRepository] = None
_supabase_client = None

def get_supabase_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    active_key = (
        settings.SUPABASE_SECRET_KEY.strip()
        or settings.SUPABASE_SERVICE_ROLE_KEY.strip()
    )
    if settings.SUPABASE_URL.strip() and active_key:
        from supabase import create_client
        _supabase_client = create_client(settings.SUPABASE_URL.strip(), active_key)
        logger.info("Successfully initialized production Supabase PostgreSQL client.")
        return _supabase_client
    return None

def get_repository() -> BaseBatteryRepository:
    """
    Dependency injection for battery repository.
    Uses Supabase PostgreSQL whenever server credentials are present (unless FORCE_MEMORY_DB=True).
    Never silently falls back to in-memory storage if Supabase initialization fails.
    """
    global _memory_repo_instance
    has_supabase_creds = bool(
        settings.SUPABASE_URL.strip()
        and (settings.SUPABASE_SECRET_KEY.strip() or settings.SUPABASE_SERVICE_ROLE_KEY.strip())
    )
    if has_supabase_creds and not settings.FORCE_MEMORY_DB:
        client = get_supabase_client()
        if not client:
            raise RuntimeError("Supabase credentials configured, but client initialization failed.")
        return SupabaseBatteryRepository(client)

    if _memory_repo_instance is None:
        _memory_repo_instance = InMemoryBatteryRepository()
        logger.info("Initialized thread-safe InMemoryBatteryRepository for explicit local test mode.")
    return _memory_repo_instance
