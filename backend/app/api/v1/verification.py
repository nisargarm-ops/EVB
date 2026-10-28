import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Response, status
import qrcode

from ...db.supabase import get_repository
from ...db.repository import BaseBatteryRepository
from ...schemas.passport import PublicPassportVerification
from ...schemas.custody import AuditTrailVerificationResponse

router = APIRouter(prefix="/verify", tags=["Public Verification & Audit"])

@router.get("/{battery_id}", response_model=PublicPassportVerification)
async def verify_battery_public(
    battery_id: str,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Public verification endpoint accessed by scanning the physical QR code on the battery.
    Requires no login. Verifies authenticity and tamper-evident audit trail integrity.
    """
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found on this metrology registry."
        )

    events = await repo.get_custody_events(passport.battery_id)
    is_chain_valid, error_msg, _ = await repo.verify_audit_trail(passport.battery_id)

    return PublicPassportVerification(
        is_authentic=True,
        battery_id=passport.battery_id,
        battery_did=passport.battery_did,
        manufacturer_name=passport.manufacturer_name,
        model_designation=passport.model_designation,
        chemistry=passport.chemistry.value if hasattr(passport.chemistry, "value") else str(passport.chemistry),
        manufacturing_date=passport.manufacturing_date,
        status=passport.status.value if hasattr(passport.status, "value") else str(passport.status),
        state_of_health_pct=passport.health_state.state_of_health_pct,
        carbon_footprint_total=passport.carbon_footprint.total_co2_kg_per_kwh,
        eu_compliance_class=passport.carbon_footprint.eu_compliance_class,
        total_custody_events=len(events),
        is_audit_chain_valid=is_chain_valid,
        verification_timestamp=datetime.now(timezone.utc).isoformat()
    )

@router.get("/{battery_id}/audit-trail", response_model=AuditTrailVerificationResponse)
async def verify_audit_trail_endpoint(
    battery_id: str,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Recalculates cryptographic SHA-256 hashes for every custody block from genesis to head,
    proving zero tampering across the cross-enterprise supply chain.
    """
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )

    events = await repo.get_custody_events(passport.battery_id)
    is_valid, err_msg, tampered_idx = await repo.verify_audit_trail(passport.battery_id)

    return AuditTrailVerificationResponse(
        battery_id=passport.battery_id,
        total_events=len(events),
        is_valid=is_valid,
        genesis_hash=events[0].hash if events else None,
        latest_block_hash=events[-1].hash if events else None,
        error_message=err_msg,
        tampered_block_index=tampered_idx,
        verified_at=datetime.now(timezone.utc).isoformat()
    )

@router.get("/{battery_id}/qr")
async def generate_qr_image(
    battery_id: str,
    repo: BaseBatteryRepository = Depends(get_repository)
):
    """
    Generates a high-resolution PNG QR code pointing to the battery's public verification page.
    """
    passport = await repo.get_passport_by_id(battery_id)
    if not passport:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Battery Passport '{battery_id}' was not found."
        )

    # Encode verification URL
    qr_data = f"http://localhost:5173/verify/{passport.battery_id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="image/png")
