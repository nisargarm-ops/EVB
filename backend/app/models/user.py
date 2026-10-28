from pydantic import BaseModel
from typing import Optional
from ..core.rbac import UserRole

class User(BaseModel):
    user_id: str
    username: str
    email: str
    hashed_password: str
    role: UserRole
    organization: str
    full_name: str
    is_active: bool = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    organization: str
    user_id: str
    full_name: str
