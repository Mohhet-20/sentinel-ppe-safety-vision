"""System health dashboard endpoint — live host + dependency metrics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.system import SystemHealth
from app.services.system_health_service import get_system_health

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/health", response_model=SystemHealth)
def system_health(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> SystemHealth:
    return get_system_health(db)
