from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Path, HTTPException, status

from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...core.security import get_current_user, require_roles
from ...core.rbac import UserRole
from ...schemas.custody import (
    CustodyTransferCreateRequest,
    CustodyTransferResponse,
    CustodyTransferActionRequest,
    CustodyEventResponse,
    CustodyEventCreateRequest
)
from ...services.custody_service import CustodyService

router = APIRouter(tags=["Chain of Custody & Transfers"])

@router.post("/custody/transfers", response_model=CustodyTransferResponse, status_code=status.HTTP_201_CREATED)
async def create_custody_transfer(
    req: CustodyTransferCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([
        UserRole.MANUFACTURER, UserRole.OEM, UserRole.FLEET_OPERATOR,
        UserRole.SERVICE_CENTER, UserRole.REMANUFACTURER, UserRole.RECYCLER,
        UserRole.ADMINISTRATOR
    ])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Initiate a formal cross-enterprise custody transfer for an EV battery pack.
    Requires authentication by the current custodian or authorized stakeholder.
    """
    service = CustodyService(repo)
    return await service.create_transfer(req, current_user)

@router.post("/custody/transfers/{transfer_id}/accept", response_model=CustodyTransferResponse)
async def accept_custody_transfer(
    transfer_id: str = Path(..., description="Custody transfer request UUID"),
    req: Optional[CustodyTransferActionRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Accept an incoming custody transfer and update battery stewardship.
    Enforces least-privilege authorization: only the designated receiver organization can accept.
    """
    service = CustodyService(repo)
    return await service.accept_transfer(transfer_id, req or CustodyTransferActionRequest(), current_user)

@router.post("/custody/transfers/{transfer_id}/reject", response_model=CustodyTransferResponse)
async def reject_custody_transfer(
    transfer_id: str = Path(..., description="Custody transfer request UUID"),
    req: Optional[CustodyTransferActionRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Reject an incoming custody transfer with reason metadata.
    Enforces least-privilege authorization: only the designated receiver organization can reject.
    """
    service = CustodyService(repo)
    return await service.reject_transfer(transfer_id, req or CustodyTransferActionRequest(), current_user)

@router.get("/custody/{battery_id}", response_model=List[CustodyEventResponse], include_in_schema=False)
async def get_custody_history(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Get full custody event chain (backwards compatibility for UI).
    """
    service = CustodyService(repo)
    return await service.get_events(battery_id)

@router.post("/custody/{battery_id}/events", response_model=CustodyEventResponse, include_in_schema=False)
async def append_custody_event(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    req: CustodyEventCreateRequest = ...,
    current_user: Dict[str, Any] = Depends(get_current_user),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Append custom custody event block (backwards compatibility for UI).
    """
    service = CustodyService(repo)
    return await service.append_event(battery_id, req, current_user)
