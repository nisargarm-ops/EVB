from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class BatteryChemistry(str, Enum):
    NMC_811 = "NMC 811"
    NMC_622 = "NMC 622"
    LFP = "LFP"
    NCA = "NCA"
    SOLID_STATE = "Solid State Li-Metal"

class LifecycleStatus(str, Enum):
    MANUFACTURED = "MANUFACTURED"
    IN_SERVICE = "IN_SERVICE"
    SECOND_LIFE = "SECOND_LIFE"
    END_OF_LIFE = "END_OF_LIFE"
    RECYCLED = "RECYCLED"

class CarbonFootprint(BaseModel):
    total_co2_kg_per_kwh: float = Field(..., description="Total lifecycle carbon footprint in kg CO2 eq/kWh")
    manufacturing_co2_kg: float = Field(..., description="Manufacturing phase CO2 emissions")
    raw_materials_co2_kg: float = Field(..., description="Raw materials extraction CO2 emissions")
    transport_co2_kg: float = Field(..., description="Transport logistics CO2 emissions")
    eu_compliance_class: str = Field(default="Class A", description="EU Carbon Footprint Performance Class")

class RecycledContent(BaseModel):
    cobalt_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Active recycled cobalt percentage")
    lithium_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Active recycled lithium percentage")
    nickel_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Active recycled nickel percentage")
    lead_percentage: float = Field(default=0.0, ge=0.0, le=100.0, description="Active recycled lead percentage")

class TechnicalSpecs(BaseModel):
    rated_capacity_kwh: float = Field(..., description="Rated battery pack energy capacity in kWh")
    nominal_voltage_v: float = Field(..., description="Nominal pack voltage in Volts")
    max_charge_power_kw: float = Field(..., description="Peak DC charging power in kW")
    cell_count: int = Field(default=192, description="Total series/parallel cell count")
    pack_weight_kg: float = Field(..., description="Total mass of battery system in kg")
    temperature_range_min_c: float = Field(default=-20.0)
    temperature_range_max_c: float = Field(default=55.0)

class HealthState(BaseModel):
    state_of_health_pct: float = Field(..., ge=0.0, le=100.0, description="Current State of Health (SoH %)")
    state_of_charge_pct: float = Field(default=80.0, ge=0.0, le=100.0, description="Current State of Charge (SoC %)")
    cycle_count: int = Field(default=0, ge=0, description="Full equivalent cycle count")
    internal_resistance_mohm: float = Field(default=18.5, description="Internal resistance in milli-ohms")
    capacity_fade_rate_pct_yr: float = Field(default=1.8, description="Annual capacity fade degradation rate")
    last_telemetry_timestamp: str = Field(default="", description="ISO timestamp of last BMS telemetry update")

class BatteryPassport(BaseModel):
    battery_did: str = Field(..., description="Decentralized Identifier (did:battery:sha256:...)")
    battery_id: str = Field(..., description="Human-friendly battery identifier (e.g. BAT-NMC-8A2F91C0)")
    serial_number: str = Field(..., description="Manufacturer unique serial number")
    manufacturer_name: str = Field(..., description="Battery cell / pack manufacturer")
    model_designation: str = Field(..., description="Battery model designation")
    chemistry: BatteryChemistry = Field(..., description="Electrochemical battery chemistry")
    manufacturing_date: str = Field(..., description="ISO 8601 manufacturing date")
    manufacturing_country: str = Field(default="DE", description="ISO 3166-1 alpha-2 country of origin")
    manufacturing_facility: str = Field(default="Gigafactory Berlin-Brandenburg")
    
    status: LifecycleStatus = Field(default=LifecycleStatus.MANUFACTURED)
    current_custodian: str = Field(..., description="Current owner / custodian organization")
    current_vehicle_vin: Optional[str] = Field(default=None, description="VIN of vehicle if installed")
    
    technical_specs: TechnicalSpecs
    carbon_footprint: CarbonFootprint
    recycled_content: RecycledContent
    health_state: HealthState
    
    qr_code_url: str = Field(default="", description="Verification portal QR link")
    created_at: str = Field(..., description="Record creation timestamp")
    updated_at: str = Field(..., description="Record last modification timestamp")
