"""
Report Service — aggregates Incident/Worker/Camera data into the summary
shape the Reports Center page needs. Produces data only; PDF/CSV/Excel
rendering is a separate concern (kept out of this foundation stage, same as
the frontend's export buttons, which are placeholders today).
"""
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.models.incident import Incident, IncidentStatus
from app.models.worker import Worker


def summary(db: Session, *, start: datetime | None = None, end: datetime | None = None) -> dict:
    stmt = select(Incident)
    if start:
        stmt = stmt.where(Incident.timestamp >= start)
    if end:
        stmt = stmt.where(Incident.timestamp <= end)
    incidents = list(db.execute(stmt).scalars())

    total_violations = len(incidents)
    resolved = sum(1 for i in incidents if i.status == IncidentStatus.RESOLVED)

    avg_compliance = db.execute(select(func.avg(Worker.compliance_score))).scalar() or 0.0
    sites_covered = db.execute(select(func.count(func.distinct(Camera.site)))).scalar() or 0

    return {
        "period_start": start.isoformat() if start else None,
        "period_end": end.isoformat() if end else None,
        "total_violations": total_violations,
        "incidents_resolved": resolved,
        "compliance_avg": round(float(avg_compliance), 1),
        "sites_covered": sites_covered,
    }
