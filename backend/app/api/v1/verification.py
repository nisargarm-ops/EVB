from fastapi import APIRouter, Depends, Path
from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...schemas.verification import PublicVerificationResponse, AuditVerificationResponse
from ...services.verification_service import VerificationService

router = APIRouter(prefix="/verify", tags=["Verification & Audit Trail"])

@router.get("/{battery_id}", response_model=PublicVerificationResponse)
async def verify_public_certificate(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Public digital certificate verification verifying authentic status and EU compliance.
    """
    service = VerificationService(repo)
    return await service.verify_public(battery_id)

@router.get("/{battery_id}/audit-trail", response_model=AuditVerificationResponse)
async def verify_audit_trail_integrity(
    battery_id: str = Path(..., description="Battery human ID or DID"),
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Cryptographic tamper detection: recalculates SHA-256 digests across all custody blocks.
    """
    service = VerificationService(repo)
    return await service.verify_audit_trail(battery_id)
