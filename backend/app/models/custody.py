from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class CustodyEventType(str, Enum):
    MANUFACTURED = "MANUFACTURED"
    OEM_ASSEMBLED = "OEM_ASSEMBLED"
    REGISTERED_FLEET = "REGISTERED_FLEET"
    MAINTENANCE_LOGGED = "MAINTENANCE_LOGGED"
    TELEMETRY_UPDATED = "TELEMETRY_UPDATED"
    TRANSFERRED_CUSTODY = "TRANSFERRED_CUSTODY"
    SECOND_LIFE_ASSIGNED = "SECOND_LIFE_ASSIGNED"
    DECOMMISSIONED = "DECOMMISSIONED"
    RECYCLED = "RECYCLED"

class CustodyEvent(BaseModel):
    event_id: str = Field(..., description="Unique event UUID")
    battery_id: str = Field(..., description="Reference battery ID or DID")
    event_type: CustodyEventType
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of the event")
    actor_id: str = Field(..., description="Identifier of the executing operator / user")
    actor_role: str = Field(..., description="Enterprise role of the actor")
    actor_organization: str = Field(..., description="Corporate organization name")
    location: str = Field(default="Unknown", description="Geographical or facility location")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Structured event metadata")
    
    prev_hash: str = Field(..., description="Cryptographic hash of the previous event (0*64 for genesis)")
    hash: str = Field(..., description="SHA-256 cryptographic hash of this event block")
