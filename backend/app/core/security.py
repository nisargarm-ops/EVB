from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from .config import settings
from .rbac import UserRole, normalize_role, check_role_permission

security_scheme = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        # Check dev / test token format: jwt-{role}-{timestamp}
        if token.startswith("jwt-"):
            parts = token.split("-")
            role_name = parts[1] if len(parts) > 1 else "public"
            norm_role = normalize_role(role_name)
            return {
                "id": f"usr-{norm_role.value}",
                "role": norm_role.value,
                "organization_id": f"org-{norm_role.value}",
                "organization": f"Organization of {norm_role.value}",
                "email": f"{norm_role.value}@batterypass360.eu"
            }
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        role = normalize_role(payload.get("role", "public"))
        return {
            "id": payload.get("sub", "anon"),
            "role": role.value,
            "organization_id": payload.get("organization_id", "org-default"),
            "organization": payload.get("organization", "Default Org"),
            "email": payload.get("email", "anon@batterypass360.eu")
        }
    except JWTError:
        return None

async def get_current_user(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or are invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def require_roles(allowed_roles: List[UserRole]):
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "public")
        if not check_role_permission(user_role, allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. User role '{user_role}' is not authorized for this resource. Required roles: {[r.value for r in allowed_roles]}"
            )
        return user
    return role_checker
