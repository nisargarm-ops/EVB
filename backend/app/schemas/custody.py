from typing import Any, Dict, Optional, List
from pydantic import BaseModel, Field
from ..models.custody import CustodyEventType, CustodyEvent

class CustodyEventCreate(BaseModel):
    event_type: CustodyEventType
    actor_id: str
    actor_role: str
    actor_organization: str
    location: str = "Unknown"
    payload: Dict[str, Any] = Field(default_factory=dict)

class AuditTrailVerificationResponse(BaseModel):
    battery_id: str
    total_events: int
    is_valid: bool
    genesis_hash: Optional[str]
    latest_block_hash: Optional[str]
    error_message: Optional[str] = None
    tampered_block_index: Optional[int] = None
    verified_at: str
