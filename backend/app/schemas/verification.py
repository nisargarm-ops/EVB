from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class VerificationCheckRequest(BaseModel):
    check_type: Optional[str] = "FULL_CRYPTOGRAPHIC_AUDIT"
    include_recalculation: bool = True

class PublicVerificationResponse(BaseModel):
    is_authentic: bool
    battery_id: str
    battery_did: str
    manufacturer_name: str
    model_designation: str
    chemistry: str
    manufacturing_date: str
    status: str
    state_of_health_pct: float
    carbon_footprint_total: float
    eu_compliance_class: str
    total_custody_events: int
    is_audit_chain_valid: bool
    verification_timestamp: str

class AuditVerificationResponse(BaseModel):
    battery_id: str
    total_events: int
    is_valid: bool
    genesis_hash: Optional[str] = None
    latest_block_hash: Optional[str] = None
    error_message: Optional[str] = None
    tampered_block_index: Optional[int] = None
    verified_at: str
