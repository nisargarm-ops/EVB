from enum import Enum
from typing import List, Set

class UserRole(str, Enum):
    MANUFACTURER = 'MANUFACTURER'
    OEM = 'OEM'
    FLEET_OPERATOR = 'FLEET_OPERATOR'
    RECYCLER = 'RECYCLER'
    REGULATOR_AUDITOR = 'REGULATOR_AUDITOR'
    PUBLIC = 'PUBLIC'

# Permission matrix for EV Battery Passport operations
ROLE_PERMISSIONS = {
    UserRole.MANUFACTURER: {
        'passport:create',
        'passport:read',
        'passport:update_specs',
        'custody:append_manufacture',
        'audit:read',
        'qpiai:opt:run',
        'qpiai:quantum:run',
    },
    UserRole.OEM: {
        'passport:read',
        'passport:attach_vehicle',
        'custody:append_oem',
        'audit:read',
    },
    UserRole.FLEET_OPERATOR: {
        'passport:read',
        'passport:update_telemetry',
        'custody:append_telemetry',
        'custody:append_transfer',
        'audit:read',
        'qpiai:opt:run',
    },
    UserRole.RECYCLER: {
        'passport:read',
        'passport:mark_eol',
        'passport:mark_recycled',
        'custody:append_recycling',
        'audit:read',
        'qpiai:opt:run',
    },
    UserRole.REGULATOR_AUDITOR: {
        'passport:read',
        'audit:read',
        'audit:verify',
        'compliance:audit',
    },
    UserRole.PUBLIC: {
        'passport:read_public',
        'audit:verify',
    }
}

def has_permission(role: UserRole, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms
