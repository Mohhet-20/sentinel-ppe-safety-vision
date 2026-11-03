"""
Incident management endpoints, with filtering to match the frontend's
Incident Center filters (severity, status, camera, worker).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate
from app.services import audit_service, incident_service

router = APIRouter(prefix="/incidents", tags=["Incidents"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[IncidentRead])
def list_incidents(
    severity: str | None = None,
    status: str | None = None,
    camera: str | None = None,
    worker_id: str | None = None,
    db: Session = Depends(get_db),
):
    return incident_service.list_incidents(db, severity=severity, status=status, camera=camera, worker_id=worker_id)


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    return incident_service.get_incident(db, incident_id)


@router.post("", response_model=IncidentRead, status_code=201)
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    return incident_service.create_incident(db, payload)


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    incident = incident_service.update_incident(db, incident_id, payload)
    changes = payload.model_dump(exclude_unset=True)
    audit_service.record(
        db,
        action="incident.update",
        actor=user.username,
        actor_id=user.id,
        target_type="incident",
        target_id=incident_id,
        summary="Updated incident: " + ", ".join(f"{k}={v}" for k, v in changes.items()) if changes else "Updated incident",
    )
    return incident


@router.delete("/{incident_id}", status_code=204)
def delete_incident(incident_id: str, db: Session = Depends(get_db)):
    incident_service.delete_incident(db, incident_id)
