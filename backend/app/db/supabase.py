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
        settings.SUPABASE_SECRET_KEY
        or settings.SUPABASE_SERVICE_ROLE_KEY
        or settings.SUPABASE_PUBLISHABLE_KEY
        or settings.SUPABASE_KEY
    )
    if settings.SUPABASE_URL and active_key:
        try:
            from supabase import create_client
            _supabase_client = create_client(settings.SUPABASE_URL, active_key)
            logger.info("Successfully initialized production Supabase PostgreSQL client.")
            return _supabase_client
        except Exception as e:
            logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to memory DB.")
            return None
    return None

def get_repository() -> BaseBatteryRepository:
    """
    Dependency injection for battery repository.
    Returns Supabase repo if credentials are configured and reachable,
    otherwise returns thread-safe in-memory repository.
    """
    global _memory_repo_instance
    if not settings.USE_MEMORY_DB:
        client = get_supabase_client()
        if client:
            return SupabaseBatteryRepository(client)
    
    if _memory_repo_instance is None:
        _memory_repo_instance = InMemoryBatteryRepository()
        logger.info("Initialized thread-safe InMemoryBatteryRepository with pre-seeded demo records.")
    return _memory_repo_instance
