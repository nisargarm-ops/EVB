from enum import Enum
from typing import List, Optional, Set
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

# Role hierarchy: Maps each role to the capabilities/roles it inherits.
# Administrators possess superuser capabilities across all stakeholder operations.
# Enterprise stakeholders (Manufacturer, Recycler, etc.) possess their domain role + Public.
# Public users only have Public access.
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
    if not role_str:
        return UserRole.PUBLIC
    clean = str(role_str).strip().lower().replace("-", "_")
    if clean in ("regulator_auditor", "regulator", "eu_auditor"):
        return UserRole.AUDITOR
    for r in UserRole:
        if r.value == clean or r.name.lower() == clean:
            return r
    return UserRole.PUBLIC

def check_role_permission(user_role: str, allowed_roles: List[UserRole]) -> bool:
    """
    Evaluates whether the user's role is granted access to an operation
    restricted to allowed_roles.
    
    Rules:
    - User capabilities are derived from ROLE_HIERARCHY for user's role.
    - If user capabilities intersect with allowed_roles, access is granted.
    - Prevents privilege escalation (e.g. public role never satisfies manufacturer requirement).
    """
    user_norm = normalize_role(user_role)
    if user_norm == UserRole.ADMINISTRATOR:
        return True
    
    user_capabilities: List[UserRole] = ROLE_HIERARCHY.get(user_norm, [user_norm, UserRole.PUBLIC])
    allowed_set: Set[UserRole] = set(allowed_roles)
    
    return any(cap in allowed_set for cap in user_capabilities)
