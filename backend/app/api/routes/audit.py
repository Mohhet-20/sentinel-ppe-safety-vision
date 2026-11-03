"""Audit trail API — read-only. Entries are written internally via audit_service."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.audit import AuditLogRead
from app.services import audit_service

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    category: str | None = Query(default=None),
    action: str | None = Query(default=None),
    actor: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[AuditLogRead]:
    return audit_service.list_logs(
        db, category=category, action=action, actor=actor, status=status, limit=limit
    )
