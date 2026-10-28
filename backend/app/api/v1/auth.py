from fastapi import APIRouter, Depends
from ...core.rbac import UserRole, normalize_role
from ...core.security import create_access_token, get_current_user
from ...schemas.auth import RoleSwitchRequest, TokenResponse, UserProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

ROLE_DEFAULT_ORGS = {
    UserRole.MANUFACTURER: "QuantumVolt Gigafactory",
    UserRole.OEM: "Apex Motors AG",
    UserRole.FLEET_OPERATOR: "Apex EV Mobility Fleet",
    UserRole.SERVICE_CENTER: "Berlin Battery Care",
    UserRole.REMANUFACTURER: "Nordic Remanufacturing Hub",
    UserRole.RECYCLER: "EcoRecycle Metals Recovery",
    UserRole.AUDITOR: "EU Metrology Authority",
    UserRole.ADMINISTRATOR: "BatteryPass 360 Governance",
    UserRole.PUBLIC: "Anonymous Citizen",
}

@router.post("/switch-role", response_model=TokenResponse)
async def switch_persona_role(req: RoleSwitchRequest):
    """
    Switch active stakeholder persona for RBAC demonstration and return a signed JWT.
    """
    norm = normalize_role(req.role)
    org = req.organization or ROLE_DEFAULT_ORGS.get(norm, "Authorized Enterprise")
    token_payload = {
        "sub": f"usr-{norm.value}",
        "role": norm.value,
        "organization": org,
        "organization_id": f"org-{norm.value}",
        "email": f"{norm.value}@batterypass360.eu"
    }
    access_token = create_access_token(token_payload)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=norm.value,
        organization=org,
        organization_id=f"org-{norm.value}"
    )

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """
    Retrieve current authenticated profile and organization context.
    """
    return UserProfileResponse(
        id=current_user.get("id", "usr-anon"),
        email=current_user.get("email", "anon@batterypass360.eu"),
        full_name=current_user.get("organization"),
        role=current_user.get("role", "public"),
        organization=current_user.get("organization", "Default Organization"),
        organization_id=current_user.get("organization_id")
    )
