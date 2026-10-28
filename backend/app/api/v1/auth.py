from fastapi import APIRouter, Depends, HTTPException, status
from ...core.security import create_access_token, get_current_user
from ...core.rbac import UserRole
from ...schemas.auth import LoginRequest, TokenResponse, SwitchRoleRequest

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

# Demo users for each enterprise role
DEMO_USERS = {
    "manufacturer": {"user_id": "USR-MFG-01", "role": UserRole.MANUFACTURER, "org": "QuantumVolt Gigafactory", "name": "Elena Rostova (Lead Cell Engineer)"},
    "oem": {"user_id": "USR-OEM-01", "role": UserRole.OEM, "org": "Apex Motors AG", "name": "Marcus Vance (Vehicle Assembly Director)"},
    "fleet": {"user_id": "USR-FLEET-01", "role": UserRole.FLEET_OPERATOR, "org": "Apex EV Mobility Fleet", "name": "Sophie Chen (Fleet Operations Manager)"},
    "recycler": {"user_id": "USR-REC-01", "role": UserRole.RECYCLER, "org": "EcoRecycle Metals Recovery", "name": "Dr. Klaus Weber (Circular Metallurgy Lead)"},
    "auditor": {"user_id": "USR-AUD-01", "role": UserRole.REGULATOR_AUDITOR, "org": "EU Metrology & Battery Authority", "name": "Jean-Luc Dubois (Chief Regulatory Inspector)"},
}

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    username_clean = req.username.strip().lower()
    user = DEMO_USERS.get(username_clean)
    if not user:
        # Generic login fallback
        user = {
            "user_id": f"USR-{username_clean.upper()}",
            "role": UserRole.MANUFACTURER,
            "org": "Enterprise Partner",
            "name": req.username.capitalize()
        }

    token_data = {
        "sub": user["user_id"],
        "username": username_clean,
        "role": user["role"].value if hasattr(user["role"], "value") else str(user["role"]),
        "org": user["org"],
        "name": user["name"]
    }
    access_token = create_access_token(data=token_data)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user["user_id"],
        username=username_clean,
        role=token_data["role"],
        organization=user["org"],
        full_name=user["name"]
    )

@router.post("/switch-role", response_model=TokenResponse)
async def switch_role(req: SwitchRoleRequest):
    """
    Convenience endpoint for pair programming, testing, and evaluators to quickly
    switch enterprise personas and test RBAC permissions.
    """
    role_map = {
        UserRole.MANUFACTURER: ("USR-MFG-01", "QuantumVolt Gigafactory", "Elena Rostova (Lead Cell Engineer)"),
        UserRole.OEM: ("USR-OEM-01", "Apex Motors AG", "Marcus Vance (Vehicle Assembly Director)"),
        UserRole.FLEET_OPERATOR: ("USR-FLEET-01", "Apex EV Mobility Fleet", "Sophie Chen (Fleet Operations Manager)"),
        UserRole.RECYCLER: ("USR-REC-01", "EcoRecycle Metals Recovery", "Dr. Klaus Weber (Circular Metallurgy Lead)"),
        UserRole.REGULATOR_AUDITOR: ("USR-AUD-01", "EU Metrology & Battery Authority", "Jean-Luc Dubois (Chief Inspector)"),
        UserRole.PUBLIC: ("USR-PUB-01", "Public Citizen / Consumer", "Anonymous Citizen"),
    }
    uid, default_org, name = role_map.get(req.role, ("USR-CUSTOM", "Custom Org", "Test User"))
    org = req.organization or default_org

    token_data = {
        "sub": uid,
        "username": req.role.value.lower(),
        "role": req.role.value,
        "org": org,
        "name": name
    }
    token = create_access_token(data=token_data)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=uid,
        username=req.role.value.lower(),
        role=req.role.value,
        organization=org,
        full_name=name
    )

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
