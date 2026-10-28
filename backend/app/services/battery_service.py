from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
import uuid

from ..db.repository import BaseBatteryRepository
from ..core.hasher import (
    GENESIS_PREV_HASH,
    calculate_event_hash,
    generate_immutable_battery_id
)
from ..schemas.battery import BatteryCreateRequest, BatteryTelemetryUpdateRequest
from ..core.rbac import UserRole, normalize_role

class BatteryService:
    def __init__(self, repo: BaseBatteryRepository):
        self.repo = repo

    async def list_batteries(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        passports = await self.repo.get_all_passports(status_filter)
        return [
            {
                "battery_id": p["battery_id"],
                "battery_did": p["battery_did"],
                "serial_number": p["serial_number"],
                "manufacturer_name": p["manufacturer_name"],
                "chemistry": p["chemistry"],
                "status": p["status"],
                "current_custodian": p["current_custodian"],
                "state_of_health_pct": p["health_state"]["state_of_health_pct"],
                "rated_capacity_kwh": p["technical_specs"]["rated_capacity_kwh"],
                "updated_at": p["updated_at"],
            }
            for p in passports
        ]

    async def get_battery(self, battery_id: str) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(battery_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Battery passport '{battery_id}' was not found in registry."
            )
        return p

    async def create_battery(self, req: BatteryCreateRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        user_role = normalize_role(current_user.get("role", "public"))
        if user_role not in (UserRole.MANUFACTURER, UserRole.ADMINISTRATOR):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only authenticated Cell Manufacturers or Administrators can register new battery passports."
            )

        now = datetime.now(timezone.utc).isoformat()
        mfg_date = req.manufacturing_date or now
        did, short_id = generate_immutable_battery_id(
            req.manufacturer_name,
            req.serial_number,
            req.chemistry,
            mfg_date
        )

        # Check for duplicate
        existing = await self.repo.get_passport_by_id(short_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Battery passport with serial '{req.serial_number}' already registered as '{short_id}'."
            )

        battery_data = {
            "id": str(uuid.uuid4()),
            "battery_id": short_id,
            "battery_did": did,
            "serial_number": req.serial_number,
            "manufacturer_name": req.manufacturer_name,
            "model_designation": req.model_designation,
            "chemistry": req.chemistry,
            "manufacturing_date": mfg_date,
            "manufacturing_country": req.manufacturing_country,
            "manufacturing_facility": req.manufacturing_facility or "Primary Facility",
            "status": "MANUFACTURED",
            "current_custodian": req.current_custodian or req.manufacturer_name,
            "current_vehicle_vin": None,
            "technical_specs": req.technical_specs.model_dump(),
            "carbon_footprint": req.carbon_footprint.model_dump(),
            "recycled_content": req.recycled_content.model_dump(),
            "health_state": {
                "state_of_health_pct": 100.0,
                "state_of_charge_pct": 100.0,
                "cycle_count": 0,
                "internal_resistance_mohm": 18.0,
                "capacity_fade_rate_pct_yr": 1.5,
                "last_telemetry_timestamp": now,
            },
            "qr_code_url": f"/api/v1/verify/{short_id}",
            "created_at": now,
            "updated_at": now,
        }

        created = await self.repo.create_passport(battery_data)

        # Create Genesis Block
        genesis_payload = {
            "batch_id": f"BATCH-{datetime.now().year}-GENESIS",
            "quality_grade": "A+",
            "initial_soh": 100.0,
            "registered_by": current_user.get("email", "mfg-lead")
        }
        await self.repo.append_custody_event({
            "event_id": f"EVT-{short_id}-GENESIS",
            "battery_id": short_id,
            "event_type": "MANUFACTURED",
            "timestamp": now,
            "actor_id": current_user.get("id", "ACTOR-MFG"),
            "actor_role": "MANUFACTURER",
            "actor_organization": req.manufacturer_name,
            "location": f"{req.manufacturing_facility}, {req.manufacturing_country}",
            "payload": genesis_payload,
            "prev_hash": GENESIS_PREV_HASH,
        })

        await self.repo.log_audit({
            "action": "REGISTER_BATTERY",
            "entity_type": "battery",
            "entity_id": short_id,
            "actor_id": current_user.get("id"),
            "actor_role": user_role.value,
            "details": {"battery_did": did, "manufacturer": req.manufacturer_name},
            "timestamp": now
        })

        return created

    async def update_telemetry(self, battery_id: str, telemetry: BatteryTelemetryUpdateRequest, current_user: Dict[str, Any]) -> Dict[str, Any]:
        p = await self.get_battery(battery_id)
        user_role = normalize_role(current_user.get("role", "public"))
        allowed = (UserRole.FLEET_OPERATOR, UserRole.SERVICE_CENTER, UserRole.OEM, UserRole.MANUFACTURER, UserRole.ADMINISTRATOR)
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role.value}' is not permitted to log battery BMS telematics."
            )

        now = datetime.now(timezone.utc).isoformat()
        hs = p["health_state"]
        hs["state_of_health_pct"] = telemetry.state_of_health_pct
        hs["state_of_charge_pct"] = telemetry.state_of_charge_pct
        hs["cycle_count"] = telemetry.cycle_count
        hs["internal_resistance_mohm"] = telemetry.internal_resistance_mohm
        hs["last_telemetry_timestamp"] = now

        # Automatic lifecycle adjustment if degraded
        new_status = p["status"]
        if telemetry.state_of_health_pct < 70.0 and p["status"] == "IN_SERVICE":
            new_status = "END_OF_LIFE"
        elif telemetry.state_of_health_pct < 80.0 and p["status"] == "IN_SERVICE":
            new_status = "SECOND_LIFE"

        updated = await self.repo.update_passport(p["battery_id"], {
            "health_state": hs,
            "status": new_status,
            "updated_at": now
        })

        # Append custody event
        event_payload = {
            "soh": telemetry.state_of_health_pct,
            "soc": telemetry.state_of_charge_pct,
            "cycles": telemetry.cycle_count,
            "internal_resistance_mohm": telemetry.internal_resistance_mohm,
            "notes": telemetry.telemetry_notes or "Periodic BMS diagnostics"
        }
        await self.repo.append_custody_event({
            "event_id": f"EVT-TELEMETRY-{int(datetime.now().timestamp())}",
            "battery_id": p["battery_id"],
            "event_type": "TELEMETRY_UPDATED",
            "timestamp": now,
            "actor_id": current_user.get("id", "ACTOR-BMS"),
            "actor_role": user_role.value.upper(),
            "actor_organization": current_user.get("organization") or p["current_custodian"],
            "location": "BMS Telematics Gateway",
            "payload": event_payload
        })

        return updated
