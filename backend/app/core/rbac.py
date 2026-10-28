from enum import Enum
from typing import List, Optional
from fastapi import HTTPException, status

class UserRole(str, Enum):
    MANUFACTURER = "manufacturer"
    SERVICE_CENTER = "service_center"
    REMANUFACTURER = "remanufacturer"
    RECYCLER = "recycler"
    AUDITOR = "auditor"
    ADMINISTRATOR = "administrator"
    
    # Aliases / legacy compatibility
    OEM = "oem"
    FLEET_OPERATOR = "fleet_operator"
    PUBLIC = "public"

ROLE_HIERARCHY = {
    UserRole.ADMINISTRATOR: [
        UserRole.ADMINISTRATOR, UserRole.AUDITOR, UserRole.MANUFACTURER,
        UserRole.SERVICE_CENTER, UserRole.REMANUFACTURER, UserRole.RECYCLER,
        UserRole.OEM, UserRole.FLEET_OPERATOR, UserRole.PUBLIC
    ],
    UserRole.AUDITOR: [UserRole.AUDITOR, UserRole.PUBLIC],
    UserRole.MANUFACTURER: [UserRole.MANUFACTURER, UserRole.PUBLIC],
    UserRole.SERVICE_CENTER: [UserRole.SERVICE_CENTER, UserRole.PUBLIC],
    UserRole.REMANUFACTURER: [UserRole.REMANUFACTURER, UserRole.PUBLIC],
    UserRole.RECYCLER: [UserRole.RECYCLER, UserRole.PUBLIC],
    UserRole.OEM: [UserRole.OEM, UserRole.PUBLIC],
    UserRole.FLEET_OPERATOR: [UserRole.FLEET_OPERATOR, UserRole.PUBLIC],
    UserRole.PUBLIC: [UserRole.PUBLIC],
}

def normalize_role(role_str: str) -> UserRole:
    """Normalizes role strings (handles uppercase, hyphens, and aliases)."""
    clean = role_str.strip().lower().replace("-", "_")
    if clean in ("regulator_auditor", "regulator"):
        return UserRole.AUDITOR
    for r in UserRole:
        if r.value == clean or r.name.lower() == clean:
            return r
    return UserRole.PUBLIC

def check_role_permission(user_role: str, allowed_roles: List[UserRole]) -> bool:
    norm = normalize_role(user_role)
    if norm == UserRole.ADMINISTRATOR:
        return True
    return any(norm == r or norm in ROLE_HIERARCHY.get(r, []) for r in allowed_roles)
