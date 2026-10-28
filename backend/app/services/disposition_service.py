from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
import uuid

from ..db.repository import BaseBatteryRepository

class DispositionService:
    def __init__(self, repo: BaseBatteryRepository):
        self.repo = repo

    async def get_or_compute_decision(self, battery_id: str) -> Dict[str, Any]:
        p = await self.repo.get_passport_by_id(battery_id)
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Battery ID '{battery_id}' was not found."
            )

        b_id = p["battery_id"]
        existing = await self.repo.get_disposition_decision(b_id)
        if existing:
            return existing

        # Compute circular disposition decision based on degradation & chemistry
        soh = p["health_state"]["state_of_health_pct"]
        cycles = p["health_state"]["cycle_count"]
        chemistry = p["chemistry"]
        now = datetime.now(timezone.utc).isoformat()

        if soh >= 80.0:
            rec = "CONTINUE_IN_SERVICE"
            pathway = "Tier-1 Vehicle Fleet In-Service Operation"
            constraints = {"min_soh": 80.0, "max_fade_rate_pct_yr": 2.5}
            explanation = f"Battery health is strong ({soh}% SoH, {cycles} cycles). Recommended to remain in primary EV automotive duty."
            status_val = "APPROVED"
        elif soh >= 70.0:
            rec = "STATIONARY_BESS"
            pathway = "Second-Life Containerized Grid Energy Storage"
            constraints = {"min_soh": 70.0, "max_temp_c": 45.0, "max_c_rate": 0.5}
            explanation = f"Automotive retirement threshold reached ({soh}% SoH), but cell uniformity and capacity are optimal for stationary peak-shaving energy storage."
            status_val = "PROPOSED"
        elif soh >= 65.0 and cycles < 2000:
            rec = "CELL_RECONDITIONING"
            pathway = "Module Disassembly & Weak Cell Remanufacturing"
            constraints = {"target_module_soh": 75.0, "max_resistance_variance_pct": 10.0}
            explanation = f"Moderate degradation ({soh}% SoH) with recoverable modules. Reconditioning and module replacement recommended before secondary deployment."
            status_val = "PROPOSED"
        else:
            rec = "DEEP_RECYCLING"
            pathway = "Hydrometallurgical Critical Mineral Extraction"
            constraints = {"target_recovery_cobalt_pct": 95.0, "target_recovery_lithium_pct": 80.0, "target_recovery_nickel_pct": 95.0}
            explanation = f"Battery has reached End of Life ({soh}% SoH, {cycles} cycles). Compliant closed-loop recycling required under EU 2023/1542 recovery targets."
            status_val = "PROPOSED"

        decision_data = {
            "id": str(uuid.uuid4()),
            "battery_id": b_id,
            "recommendation": rec,
            "recommended_pathway": pathway,
            "constraints": constraints,
            "explanation": explanation,
            "approval_status": status_val,
            "decided_by": "AUTOMATED_METROLOGY_ENGINE",
            "decided_at": now,
            "approved_by": None,
            "approved_at": None,
        }

        created = await self.repo.create_disposition_decision(decision_data)
        return created
