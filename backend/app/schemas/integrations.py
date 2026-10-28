from typing import Dict, Any, Optional
from pydantic import BaseModel

class IntegrationStatus(BaseModel):
    service: str
    status: str  # OPERATIONAL, NOT_CONFIGURED, CONNECTED, DEGRADED
    configured: bool
    details: Dict[str, Any]

class IntegrationsStatusResponse(BaseModel):
    database: IntegrationStatus
    qpiai_opt: IntegrationStatus
    qpiai_quantum: IntegrationStatus
    timestamp: str
