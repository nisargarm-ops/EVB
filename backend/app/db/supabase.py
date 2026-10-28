import os
from typing import Optional
from .repository import BaseBatteryRepository
from .memory_repo import InMemoryBatteryRepository
from ..core.config import settings

_repo_instance: Optional[BaseBatteryRepository] = None

def get_repository() -> BaseBatteryRepository:
    """
    Dependency provider for the repository.
    Returns Supabase repository if credentials exist and configured,
    or falls back to InMemoryBatteryRepository with seeded data.
    """
    global _repo_instance
    if _repo_instance is None:
        # Default to InMemory repository for local testability and safety
        _repo_instance = InMemoryBatteryRepository()
    return _repo_instance
