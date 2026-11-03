"""
Authentication endpoints: login, refresh, and the current-user profile.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.jwt import TokenError, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import UnauthorizedError
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import AccessTokenResponse, LoginRequest, RefreshRequest, TokenResponse, UserProfile
from app.services import audit_service
from app.services.user_service import authenticate_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    ip = request.client.host if request.client else None
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        audit_service.record(
            db,
            action="auth.login",
            actor=payload.username,
            status="failure",
            summary="Failed login attempt",
            ip_address=ip,
        )
        raise UnauthorizedError("Incorrect username or password")

    audit_service.record(
        db,
        action="auth.login",
        actor=user.username,
        actor_id=user.id,
        summary="Signed in",
        ip_address=ip,
    )
    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> AccessTokenResponse:
    try:
        decoded = decode_token(payload.refresh_token)
    except TokenError as exc:
        raise UnauthorizedError("Invalid or expired refresh token") from exc

    if decoded.get("type") != "refresh":
        raise UnauthorizedError("Expected a refresh token")

    user = db.get(User, decoded.get("sub"))
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    return AccessTokenResponse(access_token=create_access_token(user.id, user.role.value))


@router.get("/profile", response_model=UserProfile)
def profile(current_user: User = Depends(get_current_user)) -> User:
    return current_user
