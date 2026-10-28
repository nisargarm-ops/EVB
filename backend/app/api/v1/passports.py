from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ...core.security import get_current_user, require_roles
from ...core.rbac import UserRole
from ...core.hasher import generate_immutable_battery_id, calculate_event_hash, GENESIS_PREV_HASH
from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...models.passport import BatteryPassport, LifecycleStatus, HealthState
from ...models.custody import CustodyEvent, CustodyEventType
from ...schemas.passport import (
    BatteryPassportCreate,
    BatteryPassportUpdate,
    HealthTelemetryUpdate,
    PassportSummaryResponse
)

router = APIRouter(prefix="/passports", tags=["Battery Passports"])

@router.get("", response_model=List[PassportSummaryResponse])
async def list_passports(
    status_filter: Optional[str] = Query(None, alias="status"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    all_p = await repo.get_all_passports()
    if status_filter:
        all_p = [p for p in all_p if p.status.value.upper() == status_filter.upper()]

    return [
        PassportSummaryResponse(
            battery_id=p.battery_id,
            battery_did=p.battery_did,
            serial_number=p.serial_number,
            manufacturer_name=p.manufacturer_name,
            chemistry=p.chemistry.value if hasattr(p.chemistry, "value") else str(p.chemistry),
            status=p.status.value if hasattr(p.status, "value") else str(p.status),
            current_custodian=p.current_custodian,
            state_of_health_pct=p.health_state.state_of_health_pct,
            rated_capacity_kwh=p.technical_specs.rated_capacity_kwh,
            updated_at=p.updated_at
        )
        for p in all_p
    ]

@router.get("/{battery_id}", response_model=BatteryPassport)
async def get_passport(
    battery_id: str,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )
    return passport

@router.post("", response_model=BatteryPassport, status_code=status.HTTP_201_CREATED)
async def create_passport(
    req: BatteryPassportCreate,
    current_user: dict = Depends(require_roles([UserRole.MANUFACTURER])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    # 1. Deterministic immutable battery DID and short readable identifier
    chem_val = req.chemistry.value if hasattr(req.chemistry, "value") else str(req.chemistry)
    did, short_id = generate_immutable_battery_id(
        manufacturer=req.manufacturer_name,
        serial_number=req.serial_number,
        chemistry=chem_val,
        manufacture_date=req.manufacturing_date
    )

    # Check if duplicate exists
    existing = await repo.get_passport_by_id(short_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Battery Passport with ID '{short_id}' already exists."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    health = req.health_state or HealthState(
        state_of_health_pct=100.0,
        state_of_charge_pct=100.0,
        cycle_count=0,
        internal_resistance_mohm=16.0,
        capacity_fade_rate_pct_yr=1.5,
        last_telemetry_timestamp=now_iso
    )

    passport = BatteryPassport(
        battery_did=did,
        battery_id=short_id,
        serial_number=req.serial_number,
        manufacturer_name=req.manufacturer_name,
        model_designation=req.model_designation,
        chemistry=req.chemistry,
        manufacturing_date=req.manufacturing_date,
        manufacturing_country=req.manufacturing_country,
        manufacturing_facility=req.manufacturing_facility,
        status=LifecycleStatus.MANUFACTURED,
        current_custodian=req.current_custodian,
        current_vehicle_vin=None,
        technical_specs=req.technical_specs,
        carbon_footprint=req.carbon_footprint,
        recycled_content=req.recycled_content,
        health_state=health,
        qr_code_url=f"/api/v1/verify/{short_id}",
        created_at=now_iso,
        updated_at=now_iso
    )

    await repo.create_passport(passport)

    # 2. Append Genesis Custody Block
    genesis_payload = {
        "event": "Genesis Battery Creation",
        "rated_capacity_kwh": req.technical_specs.rated_capacity_kwh,
        "chemistry": chem_val,
        "facility": req.manufacturing_facility
    }
    genesis_hash = calculate_event_hash(
        prev_hash=GENESIS_PREV_HASH,
        battery_id=short_id,
        event_type=CustodyEventType.MANUFACTURED.value,
        timestamp=now_iso,
        actor_id=current_user.get("sub", "SYSTEM"),
        payload=genesis_payload
    )
    genesis_event = CustodyEvent(
        event_id=f"EVT-{short_id}-000",
        battery_id=short_id,
        event_type=CustodyEventType.MANUFACTURED,
        timestamp=now_iso,
        actor_id=current_user.get("sub", "SYSTEM"),
        actor_role=current_user.get("role", "MANUFACTURER"),
        actor_organization=current_user.get("org", req.manufacturer_name),
        location=f"{req.manufacturing_facility}, {req.manufacturing_country}",
        payload=genesis_payload,
        prev_hash=GENESIS_PREV_HASH,
        hash=genesis_hash
    )
    await repo.append_custody_event(genesis_event)

    return passport

@router.patch("/{battery_id}/telemetry", response_model=BatteryPassport)
async def update_health_telemetry(
    battery_id: str,
    req: HealthTelemetryUpdate,
    current_user: dict = Depends(require_roles([UserRole.FLEET_OPERATOR, UserRole.OEM, UserRole.MANUFACTURER])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    new_health = HealthState(
        state_of_health_pct=req.state_of_health_pct,
        state_of_charge_pct=req.state_of_charge_pct,
        cycle_count=req.cycle_count,
        internal_resistance_mohm=req.internal_resistance_mohm,
        capacity_fade_rate_pct_yr=req.capacity_fade_rate_pct_yr or passport.health_state.capacity_fade_rate_pct_yr,
        last_telemetry_timestamp=now_iso
    )

    updated = await repo.update_passport(battery_id, {"health_state": new_health})

    # Append Telemetry Custody Event Block
    events = await repo.get_custody_events(battery_id)
    prev_hash = events[-1].hash if events else GENESIS_PREV_HASH
    payload = {
        "state_of_health_pct": req.state_of_health_pct,
        "state_of_charge_pct": req.state_of_charge_pct,
        "cycle_count": req.cycle_count,
        "notes": req.telemetry_notes or "Regular BMS telemetry sync"
    }
    evt_hash = calculate_event_hash(
        prev_hash=prev_hash,
        battery_id=battery_id,
        event_type=CustodyEventType.TELEMETRY_UPDATED.value,
        timestamp=now_iso,
        actor_id=current_user.get("sub", "ACTOR"),
        payload=payload
    )
    evt = CustodyEvent(
        event_id=f"EVT-{battery_id}-{len(events):03d}",
        battery_id=battery_id,
        event_type=CustodyEventType.TELEMETRY_UPDATED,
        timestamp=now_iso,
        actor_id=current_user.get("sub", "ACTOR"),
        actor_role=current_user.get("role", "FLEET_OPERATOR"),
        actor_organization=current_user.get("org", "Fleet Ops"),
        location="BMS Gateway Cloud Sync",
        payload=payload,
        prev_hash=prev_hash,
        hash=evt_hash
    )
    await repo.append_custody_event(evt)
    return updated
