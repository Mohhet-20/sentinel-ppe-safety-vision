from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import require_roles
from app.core.exceptions import NotFoundError
from app.database.session import get_db
from app.models.user import UserRole, User
from app.schemas.user import CreateUserRequest, UserBase, UpdateUserRequest, ResetPasswordRequest
from app.services import audit_service
from app.services.user_service import (
    create_user,
    list_users,
    update_user,
    delete_user,
    set_user_password,
    set_user_active,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserBase], dependencies=[Depends(require_roles(UserRole.ADMIN))])
def get_users(db: Session = Depends(get_db)):
    return list_users(db)


@router.post("/", response_model=UserBase, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def post_user(payload: CreateUserRequest, db: Session = Depends(get_db)):
    # Only admins may create users
    try:
        role = UserRole(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    user = create_user(db, username=payload.username, email=payload.email, password=payload.password, role=role, full_name=payload.full_name)
    audit_service.record(db, action="users.create", actor=payload.username, actor_id=user.id, status="success", summary="Created user")
    return user


@router.patch("/{user_id}", response_model=UserBase, dependencies=[Depends(require_roles(UserRole.ADMIN))])
def patch_user(user_id: str, payload: UpdateUserRequest, db: Session = Depends(get_db)):
    changes = payload.model_dump(exclude_unset=True)
    user = update_user(db, user_id, **changes)
    if not user:
        raise NotFoundError("User not found")
    audit_service.record(db, action="users.update", actor_id=user.id, status="success", summary="Updated user")
    return user


@router.delete("/{user_id}", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def remove_user(user_id: str, db: Session = Depends(get_db)):
    ok = delete_user(db, user_id)
    if not ok:
        raise NotFoundError("User not found")
    audit_service.record(db, action="users.delete", actor_id=user_id, status="success", summary="Deleted user")
    return {"ok": True}


@router.post("/{user_id}/reset-password", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def reset_password(user_id: str, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = set_user_password(db, user_id, payload.new_password)
    if not user:
        raise NotFoundError("User not found")
    audit_service.record(db, action="users.reset_password", actor_id=user.id, status="success", summary="Password reset")
    return {"ok": True}


@router.post("/{user_id}/enable", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def enable_user(user_id: str, db: Session = Depends(get_db)):
    user = set_user_active(db, user_id, True)
    if not user:
        raise NotFoundError("User not found")
    audit_service.record(db, action="users.enable", actor_id=user.id, status="success", summary="Enabled user")
    return {"ok": True}


@router.post("/{user_id}/disable", dependencies=[Depends(require_roles(UserRole.ADMIN))])
def disable_user(user_id: str, db: Session = Depends(get_db)):
    user = set_user_active(db, user_id, False)
    if not user:
        raise NotFoundError("User not found")
    audit_service.record(db, action="users.disable", actor_id=user.id, status="success", summary="Disabled user")
    return {"ok": True}
