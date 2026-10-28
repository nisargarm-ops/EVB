from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status

from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...core.security import get_current_user, get_current_user_optional, require_roles
from ...core.rbac import UserRole
from ...schemas.battery import (
    BatteryCreateRequest,
    BatteryResponse,
    BatterySummary,
    BatteryTelemetryUpdateRequest
)
from ...schemas.custody import CustodyEventResponse
from ...schemas.verification import VerificationCheckRequest, PublicVerificationResponse
from ...services.battery_service import BatteryService
from ...services.custody_service import CustodyService
from ...services.verification_service import VerificationService

router = APIRouter(tags=["Batteries & Passports"])

@router.get("/batteries", response_model=List[BatterySummary])
@router.get("/passports", response_model=List[BatterySummary], include_in_schema=False)
async def list_batteries(
    status: Optional[str] = Query(None, description="Filter by lifecycle status (IN_SERVICE, SECOND_LIFE, etc.)"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    List all EV battery passports with optional status filtering.
    Publicly accessible or authenticated for stakeholder views.
    """
    service = BatteryService(repo)
    return await service.list_batteries(status)

@router.post("/batteries", response_model=BatteryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/passports", response_model=BatteryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_battery(
    req: BatteryCreateRequest,
    current_user: Dict[str, Any] = Depends(require_roles([UserRole.MANUFACTURER, UserRole.ADMINISTRATOR])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Mint a new EU 2023/1542 compliant battery passport with genesis block.
    Restricted to authenticated Cell Manufacturers and Administrators.
    """
    service = BatteryService(repo)
    return await service.create_battery(req, current_user)

@router.get("/batteries/{battery_id}", response_model=BatteryResponse)
@router.get("/passports/{battery_id}", response_model=BatteryResponse, include_in_schema=False)
async def get_battery_details(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Retrieve full digital passport and metrology specifications for a battery.
    """
    service = BatteryService(repo)
    return await service.get_battery(battery_id)

@router.get("/batteries/{battery_id}/events", response_model=List[CustodyEventResponse])
async def get_battery_events(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Retrieve the append-only cryptographic lifecycle custody events for a battery.
    """
    service = CustodyService(repo)
    return await service.get_events(battery_id)

@router.post("/batteries/{battery_id}/verify", response_model=PublicVerificationResponse)
async def verify_battery_authenticity(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    req: Optional[VerificationCheckRequest] = None,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Perform official cryptographic verification check on a battery and its hash chain.
    """
    service = VerificationService(repo)
    return await service.verify_public(battery_id)

@router.patch("/batteries/{battery_id}/telemetry", response_model=BatteryResponse)
@router.patch("/passports/{battery_id}/telemetry", response_model=BatteryResponse, include_in_schema=False)
async def update_battery_telemetry(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    telemetry: BatteryTelemetryUpdateRequest = ...,
    current_user: Dict[str, Any] = Depends(require_roles([
        UserRole.FLEET_OPERATOR, UserRole.SERVICE_CENTER, UserRole.OEM,
        UserRole.MANUFACTURER, UserRole.ADMINISTRATOR
    ])),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Record periodic BMS telematics update and append a verified block to the hash chain.
    """
    service = BatteryService(repo)
    return await service.update_telemetry(battery_id, telemetry, current_user)
