from fastapi import APIRouter, Depends, Path

from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...schemas.disposition import DispositionDecisionResponse
from ...services.disposition_service import DispositionService

router = APIRouter(tags=["Circular Disposition & Second-Life"])

@router.get("/decisions/{battery_id}", response_model=DispositionDecisionResponse)
async def get_battery_disposition_decision(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Retrieve or evaluate the circular economy disposition decision for an EV battery.
    Provides automated pathway recommendations (Stationary BESS, Reconditioning, Deep Recycling),
    operating constraints, and compliance rationale.
    """
    service = DispositionService(repo)
    return await service.get_or_compute_decision(battery_id)
