from typing import Optional, List
from pydantic import BaseModel, Field
from ..models.passport import (
    BatteryChemistry,
    LifecycleStatus,
    TechnicalSpecs,
    CarbonFootprint,
    RecycledContent,
    HealthState,
    BatteryPassport
)

class BatteryPassportCreate(BaseModel):
    serial_number: str = Field(..., json_schema_extra={"example": "SN-2024-NMC-98124"})
    manufacturer_name: str = Field(..., json_schema_extra={"example": "QuantumVolt Cell Technologies"})
    model_designation: str = Field(..., json_schema_extra={"example": "QV-Pack-90X"})
    chemistry: BatteryChemistry = Field(..., json_schema_extra={"example": BatteryChemistry.NMC_811})
    manufacturing_date: str = Field(..., json_schema_extra={"example": "2024-03-15T08:00:00Z"})
    manufacturing_country: str = Field(default="DE", json_schema_extra={"example": "DE"})
    manufacturing_facility: str = Field(default="Gigafactory Berlin", json_schema_extra={"example": "Gigafactory Berlin"})
    current_custodian: str = Field(..., json_schema_extra={"example": "QuantumVolt Manufacturing"})
    
    technical_specs: TechnicalSpecs
    carbon_footprint: CarbonFootprint
    recycled_content: RecycledContent
    health_state: Optional[HealthState] = None

class BatteryPassportUpdate(BaseModel):
    status: Optional[LifecycleStatus] = None
    current_custodian: Optional[str] = None
    current_vehicle_vin: Optional[str] = None

class HealthTelemetryUpdate(BaseModel):
    state_of_health_pct: float = Field(..., ge=0.0, le=100.0)
    state_of_charge_pct: float = Field(..., ge=0.0, le=100.0)
    cycle_count: int = Field(..., ge=0)
    internal_resistance_mohm: float = Field(..., gt=0.0)
    capacity_fade_rate_pct_yr: Optional[float] = None
    telemetry_notes: Optional[str] = None

class PassportSummaryResponse(BaseModel):
    battery_id: str
    battery_did: str
    serial_number: str
    manufacturer_name: str
    chemistry: str
    status: str
    current_custodian: str
    state_of_health_pct: float
    rated_capacity_kwh: float
    updated_at: str

class PublicPassportVerification(BaseModel):
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
