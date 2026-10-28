from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from ..db.repository import BaseBatteryRepository
from ..core.hasher import verify_chain_integrity
from ..schemas.verification import PublicVerificationResponse, AuditVerificationResponse

class VerificationService:
    def __init__(self, repo: BaseBatteryRepository):
        self.repo = repo

    async def verify_public(self, battery_id: str) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(battery_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Battery ID '{battery_id}' was not found in public registry."
            )

        events = await self.repo.get_custody_events(p["battery_id"])
        is_valid, err_msg, tampered_idx = verify_chain_integrity(events)

        return {
            "is_authentic": True,
            "battery_id": p["battery_id"],
            "battery_did": p["battery_did"],
            "manufacturer_name": p["manufacturer_name"],
            "model_designation": p["model_designation"],
            "chemistry": p["chemistry"],
            "manufacturing_date": p["manufacturing_date"],
            "status": p["status"],
            "state_of_health_pct": p["health_state"]["state_of_health_pct"],
            "carbon_footprint_total": p["carbon_footprint"]["total_co2_kg_per_kwh"],
            "eu_compliance_class": p["carbon_footprint"]["eu_compliance_class"],
            "total_custody_events": len(events),
            "is_audit_chain_valid": is_valid,
            "verification_timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def verify_audit_trail(self, battery_id: str) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(battery_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Battery ID '{battery_id}' was not found."
            )

        events = await self.repo.get_custody_events(p["battery_id"])
        is_valid, err_msg, tampered_idx = verify_chain_integrity(events)

        return {
            "battery_id": p["battery_id"],
            "total_events": len(events),
            "is_valid": is_valid,
            "genesis_hash": events[0]["hash"] if events else None,
            "latest_block_hash": events[-1]["hash"] if events else None,
            "error_message": err_msg,
            "tampered_block_index": tampered_idx,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }
