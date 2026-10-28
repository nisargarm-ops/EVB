from pydantic import BaseModel, EmailStr
from typing import Optional
from ..core.rbac import UserRole

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str
    organization: str
    full_name: str

class SwitchRoleRequest(BaseModel):
    role: UserRole
    organization: Optional[str] = None
