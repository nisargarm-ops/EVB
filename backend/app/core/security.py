from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, ExpiredSignatureError, jwt

from .config import settings
from .rbac import UserRole, normalize_role, check_role_permission

security_scheme = HTTPBearer(auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Issues a cryptographically signed HMAC-SHA256 JWT containing identity,
    role, and organization claims with an explicit expiration timestamp.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": settings.PROJECT_NAME
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and cryptographically validates a JWT token.
    Raises HTTPException(401) on expiration or invalid signature.
    Zero backdoors: never accepts unverified strings or prefixes.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"verify_exp": True, "verify_signature": True}
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature has expired. Please authenticate again.",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token has expired\""},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token could not be verified. Invalid signature or payload.",
            headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"The token is invalid\""},
        )

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme)
) -> Optional[Dict[str, Any]]:
    """
    Extracts and verifies user identity if Authorization header is present.
    If no credentials are provided, returns None for public endpoints.
    If credentials ARE provided but invalid, raises 401 Unauthorized immediately.
    """
    if not credentials or not credentials.credentials:
        return None
    
    token = credentials.credentials.strip()
    payload = decode_access_token(token)
    
    role = normalize_role(payload.get("role", "public"))
    return {
        "id": payload.get("sub", "anon"),
        "role": role.value,
        "organization_id": payload.get("organization_id", "org-default"),
        "organization": payload.get("organization", "Default Organization"),
        "email": payload.get("email", "anon@batterypass360.eu")
    }

async def get_current_user(
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    """
    Enforces authentication requirement: raises 401 Unauthorized if no valid credentials provided.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided or are invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def require_roles(allowed_roles: List[UserRole]):
    """
    FastAPI dependency factory enforcing Role-Based Access Control (RBAC).
    Returns 401 if unauthenticated, 403 Forbidden if user's role is not authorized.
    """
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "public")
        if not check_role_permission(user_role, allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. User role '{user_role}' is not authorized for this resource. "
                    f"Required roles: {[r.value for r in allowed_roles]}"
                )
            )
        return user
    return role_checker
