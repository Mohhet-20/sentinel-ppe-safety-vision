"""
System settings endpoints. Stored in-memory for this foundation — swap for
a persisted settings table (or per-user settings) when needed. Mutations are
written to the audit trail.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.settings import SystemSettings
from app.services import audit_service

router = APIRouter(prefix="/settings", tags=["Settings"])

_settings_store = SystemSettings()


@router.get("", response_model=SystemSettings)
def get_settings(_user: User = Depends(get_current_user)) -> SystemSettings:
    return _settings_store


@router.put("", response_model=SystemSettings)
def update_settings(
    payload: SystemSettings,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SystemSettings:
    global _settings_store
    _settings_store = payload
    audit_service.record(
        db,
        action="settings.update",
        actor=user.username,
        actor_id=user.id,
        target_type="settings",
        summary=(
            f"Updated detection/alert/report settings "
            f"(confidence {payload.detection.confidence_threshold}, tracker {payload.detection.tracker})"
        ),
    )
    return _settings_store
