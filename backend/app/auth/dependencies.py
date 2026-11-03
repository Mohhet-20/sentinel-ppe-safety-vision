"""
FastAPI dependencies for authenticating requests and enforcing roles.
"""
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.auth.jwt import TokenError, decode_token
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.database.session import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise UnauthorizedError("Missing bearer token")
    try:
        payload = decode_token(token)
    except TokenError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Expected an access token")

    user_id = payload.get("sub")
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


def require_roles(*roles: UserRole):
    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if roles and current_user.role not in roles:
            raise ForbiddenError("You do not have permission to perform this action")
        return current_user

    return _dependency
