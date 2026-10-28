from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class TechnicalSpecsSchema(BaseModel):
    rated_capacity_kwh: float = Field(..., gt=0, description="Rated energy storage capacity in kilowatt-hours")
    nominal_voltage_v: float = Field(..., gt=0, description="Nominal pack voltage in Volts")
    max_charge_power_kw: float = Field(..., gt=0, description="Peak allowable charging power in kW")
    cell_count: int = Field(..., gt=0, description="Total individual cells inside pack")
    pack_weight_kg: float = Field(..., gt=0, description="Total battery pack mass in kg")
    temperature_range_min_c: Optional[float] = -20.0
    temperature_range_max_c: Optional[float] = 55.0

class CarbonFootprintSchema(BaseModel):
    total_co2_kg_per_kwh: float = Field(..., ge=0, description="Total life cycle carbon footprint in kg CO2e per kWh")
    manufacturing_co2_kg: float = Field(..., ge=0)
    raw_materials_co2_kg: float = Field(..., ge=0)
    transport_co2_kg: float = Field(..., ge=0)
    eu_compliance_class: str = Field("Class A", description="Carbon footprint performance class under EU 2023/1542")

class RecycledContentSchema(BaseModel):
    cobalt_percentage: float = Field(0.0, ge=0, le=100)
    lithium_percentage: float = Field(0.0, ge=0, le=100)
    nickel_percentage: float = Field(0.0, ge=0, le=100)
    lead_percentage: float = Field(0.0, ge=0, le=100)

class HealthStateSchema(BaseModel):
    state_of_health_pct: float = Field(100.0, ge=0, le=100)
    state_of_charge_pct: float = Field(100.0, ge=0, le=100)
    cycle_count: int = Field(0, ge=0)
    internal_resistance_mohm: float = Field(18.0, ge=0)
    capacity_fade_rate_pct_yr: float = Field(1.5, ge=0)
    last_telemetry_timestamp: Optional[str] = None

class BatteryCreateRequest(BaseModel):
    serial_number: str = Field(..., min_length=3, max_length=128)
    manufacturer_name: str = Field(..., min_length=2, max_length=255)
    model_designation: str = Field(..., min_length=2, max_length=128)
    chemistry: str = Field(..., min_length=2, max_length=64)
    manufacturing_date: Optional[str] = None
    manufacturing_country: str = Field("DE", min_length=2, max_length=3)
    manufacturing_facility: Optional[str] = "Primary Facility"
    current_custodian: Optional[str] = None
    technical_specs: TechnicalSpecsSchema
    carbon_footprint: CarbonFootprintSchema
    recycled_content: RecycledContentSchema

class BatteryResponse(BaseModel):
    id: Optional[str] = None
    battery_id: str
    battery_did: str
    serial_number: str
    manufacturer_name: str
    model_designation: str
    chemistry: str
    manufacturing_date: str
    manufacturing_country: str
    manufacturing_facility: str
    status: str
    current_custodian: str
    current_vehicle_vin: Optional[str] = None
    technical_specs: TechnicalSpecsSchema
    carbon_footprint: CarbonFootprintSchema
    recycled_content: RecycledContentSchema
    health_state: HealthStateSchema
    qr_code_url: str
    created_at: str
    updated_at: str

class BatterySummary(BaseModel):
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

class BatteryTelemetryUpdateRequest(BaseModel):
    state_of_health_pct: float = Field(..., ge=0, le=100)
    state_of_charge_pct: float = Field(..., ge=0, le=100)
    cycle_count: int = Field(..., ge=0)
    internal_resistance_mohm: float = Field(..., ge=0)
    telemetry_notes: Optional[str] = "Periodic BMS diagnostic log"
