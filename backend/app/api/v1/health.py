from fastapi import APIRouter
from datetime import datetime, timezone
from ...core.config import settings

router = APIRouter(tags=["Health & Status"])

@router.get("/health")
async def health_check():
    """
    Health check endpoint returning system status and service mode.
    """
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_backend": "in-memory" if settings.USE_MEMORY_DB or not settings.SUPABASE_URL else "supabase-postgresql",
        "eu_regulation": "EU 2023/1542 compliant"
    }
