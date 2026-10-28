from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from ...core.security import get_current_user, require_roles
from ...core.rbac import UserRole
from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...models.custody import CustodyEvent, CustodyEventType
from ...schemas.custody import CustodyEventCreate

router = APIRouter(prefix="/custody", tags=["Chain of Custody Events"])

@router.get("/{battery_id}", response_model=List[CustodyEvent])
async def get_custody_chain(
    battery_id: str,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )
    return await repo.get_custody_events(battery_id)

@router.post("/{battery_id}/events", response_model=CustodyEvent, status_code=status.HTTP_201_CREATED)
async def append_custody_event(
    battery_id: str,
    req: CustodyEventCreate,
    current_user: dict = Depends(get_current_user),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    events = await repo.get_custody_events(battery_id)
    event_id = f"EVT-{battery_id}-{len(events):03d}"

    event = CustodyEvent(
        event_id=event_id,
        battery_id=battery_id,
        event_type=req.event_type,
        timestamp=now_iso,
        actor_id=req.actor_id or current_user.get("sub", "ACTOR"),
        actor_role=req.actor_role or current_user.get("role", "OPERATOR"),
        actor_organization=req.actor_organization or current_user.get("org", "Partner Org"),
        location=req.location,
        payload=req.payload,
        prev_hash="",  # Computed automatically by repo
        hash=""        # Computed automatically by repo
    )

    saved_event = await repo.append_custody_event(event)

    # Automatically transition passport status if event dictates lifecycle change
    if req.event_type == CustodyEventType.SECOND_LIFE_ASSIGNED:
        await repo.update_passport(battery_id, {"status": "SECOND_LIFE", "current_custodian": req.actor_organization})
    elif req.event_type == CustodyEventType.DECOMMISSIONED:
        await repo.update_passport(battery_id, {"status": "END_OF_LIFE"})
    elif req.event_type == CustodyEventType.RECYCLED:
        await repo.update_passport(battery_id, {"status": "RECYCLED", "current_custodian": req.actor_organization})
    elif req.event_type == CustodyEventType.TRANSFERRED_CUSTODY:
        await repo.update_passport(battery_id, {"current_custodian": req.actor_organization})

    return saved_event
