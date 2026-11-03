from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate, IncidentUpdate


def list_incidents(
    db: Session,
    *,
    severity: str | None = None,
    status: str | None = None,
    camera: str | None = None,
    worker_id: str | None = None,
) -> list[Incident]:
    stmt = select(Incident)
    if severity and severity != "all":
        stmt = stmt.where(Incident.severity == severity)
    if status and status != "all":
        stmt = stmt.where(Incident.status == status)
    if camera and camera != "all":
        stmt = stmt.where(Incident.camera == camera)
    if worker_id:
        stmt = stmt.where(Incident.worker_id == worker_id)
    return list(db.execute(stmt.order_by(Incident.timestamp.desc())).scalars())


def get_incident(db: Session, incident_id: str) -> Incident:
    incident = db.get(Incident, incident_id)
    if incident is None:
        raise NotFoundError(f"Incident '{incident_id}' not found")
    return incident


def create_incident(db: Session, data: IncidentCreate) -> Incident:
    incident = Incident(**data.model_dump())
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def update_incident(db: Session, incident_id: str, data: IncidentUpdate) -> Incident:
    incident = get_incident(db, incident_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(incident, field, value)
    db.commit()
    db.refresh(incident)
    return incident


def delete_incident(db: Session, incident_id: str) -> None:
    incident = get_incident(db, incident_id)
    db.delete(incident)
    db.commit()
