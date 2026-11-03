"""
Model management endpoints — inspect and (re)load the active detection model.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.logging import logger
from app.database.session import get_db
from app.models.user import User
from app.schemas.detection import ModelStatus
from app.services import audit_service
from app.services.inference_service import inference_service

router = APIRouter(prefix="/models", tags=["Model Management"])


@router.get("/status", response_model=ModelStatus)
def get_model_status(_user: User = Depends(get_current_user)) -> ModelStatus:
    return ModelStatus(**inference_service.model_status())


@router.post("/reload", response_model=ModelStatus)
def reload_model(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ModelStatus:
    logger.info("Model reload requested via API")
    inference_service.reload_model()
    status = inference_service.model_status()
    audit_service.record(
        db,
        action="model.reload",
        actor=user.username,
        actor_id=user.id,
        target_type="model",
        target_id=status.get("model_path"),
        status="success" if status.get("is_loaded") else "failure",
        summary=f"Reloaded detection model (loaded={status.get('is_loaded')}, device={status.get('device')})",
    )
    return ModelStatus(**status)
