from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class CustodyEventResponse(BaseModel):
    event_id: str
    battery_id: str
    event_type: str
    timestamp: str
    actor_id: str
    actor_role: str
    actor_organization: str
    location: str
    payload: Dict[str, Any]
    prev_hash: str
    hash: str

class CustodyEventCreateRequest(BaseModel):
    event_type: str = Field(..., description="Lifecycle event type e.g. OEM_ASSEMBLED, SECOND_LIFE_ASSIGNED")
    location: Optional[str] = "Facility Gate"
    payload: Dict[str, Any] = Field(default_factory=dict)
    actor_organization: Optional[str] = None

class CustodyTransferCreateRequest(BaseModel):
    battery_id: str = Field(..., description="Battery human ID or DID to transfer")
    receiver_org_id: str = Field(..., description="Target receiving organization UUID or name")
    receiver_organization_name: Optional[str] = None
    transfer_type: str = Field("FLEET_ASSIGNMENT", description="Type of transfer e.g. OEM_DELIVERY, SECOND_LIFE_HANDOFF")
    notes: Optional[str] = None

class CustodyTransferResponse(BaseModel):
    id: str
    battery_id: str
    sender_org_id: str
    sender_org_name: str
    receiver_org_id: str
    receiver_org_name: str
    sender_actor_id: Optional[str] = None
    receiver_actor_id: Optional[str] = None
    state: str  # PENDING, ACCEPTED, REJECTED, CANCELLED
    transfer_type: str
    notes: Optional[str] = None
    initiated_at: str
    responded_at: Optional[str] = None
    rejection_reason: Optional[str] = None

class CustodyTransferActionRequest(BaseModel):
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None
