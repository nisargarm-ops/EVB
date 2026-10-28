from typing import Optional
from pydantic import BaseModel
from ..core.rbac import UserRole

class RoleSwitchRequest(BaseModel):
    role: UserRole
    organization: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    organization: str
    organization_id: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    organization: str
    organization_id: Optional[str] = None
