"""
Analytics Service — every number the Analytics dashboard needs, computed
directly from the database (Incident / Worker / Camera / Zone tables) plus
live model telemetry (InferenceService). No mock data.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.models.incident import Incident, IncidentSeverity
from app.models.worker import Worker
from app.models.zone import Zone
from app.services.inference_service import inference_service


def _period_bounds(days: int) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    return now - timedelta(days=days), now


def _count_incidents_since(db: Session, since: datetime) -> int:
    return db.execute(select(func.count(Incident.id)).where(Incident.timestamp >= since)).scalar() or 0


def executive_summary(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start, _ = _period_bounds(7)
    month_start, _ = _period_bounds(30)

    todays_violations = _count_incidents_since(db, today_start)
    weekly_violations = _count_incidents_since(db, week_start)
    monthly_violations = _count_incidents_since(db, month_start)

    avg_compliance = db.execute(select(func.avg(Worker.compliance_score))).scalar() or 0.0
    avg_confidence = db.execute(select(func.avg(Incident.confidence))).scalar() or 0.0

    model_status = inference_service.model_status()

    return {
        "live_compliance": round(float(avg_compliance), 1),
        "todays_violations": todays_violations,
        "weekly_violations": weekly_violations,
        "monthly_violations": monthly_violations,
        "average_confidence": round(float(avg_confidence) * 100, 1) if avg_confidence else 0.0,
        "fps": model_status["avg_fps"],
        "latency_ms": model_status["avg_latency_ms"],
        "model_loaded": model_status["is_loaded"],
    }


def worker_risk_ranking(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(select(Worker).order_by(Worker.risk_score.desc()).limit(limit)).scalars().all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "department": w.department,
            "risk_score": w.risk_score,
            "compliance_score": w.compliance_score,
        }
        for w in rows
    ]


def zone_ranking(db: Session, limit: int = 10) -> list[dict]:
    rows = db.execute(
        select(Zone.id, Zone.name, Zone.zone_type, func.count(Incident.id).label("violation_count"))
        .join(Incident, Incident.zone_id == Zone.id, isouter=True)
        .group_by(Zone.id)
        .order_by(func.count(Incident.id).desc())
        .limit(limit)
    ).all()
    return [
        {"id": zid, "name": name, "zone_type": ztype.value, "violation_count": count}
        for zid, name, ztype, count in rows
    ]


def camera_statistics(db: Session) -> list[dict]:
    rows = db.execute(
        select(Camera.id, Camera.name, Camera.status, func.count(Incident.id).label("violation_count"))
        .join(Incident, Incident.camera_id == Camera.id, isouter=True)
        .group_by(Camera.id)
        .order_by(func.count(Incident.id).desc())
    ).all()
    return [
        {"id": cid, "name": name, "status": status.value, "violation_count": count}
        for cid, name, status, count in rows
    ]


def detection_trends(db: Session, days: int = 14) -> list[dict]:
    """Daily incident counts for the last `days` days (oldest first)."""
    start, _ = _period_bounds(days)
    rows = db.execute(
        select(func.date(Incident.timestamp).label("day"), func.count(Incident.id))
        .where(Incident.timestamp >= start)
        .group_by(func.date(Incident.timestamp))
        .order_by(func.date(Incident.timestamp))
    ).all()
    return [{"day": str(day), "count": count} for day, count in rows]


def severity_breakdown(db: Session) -> dict[str, int]:
    rows = db.execute(select(Incident.severity, func.count()).group_by(Incident.severity)).all()
    breakdown = {s.value: 0 for s in IncidentSeverity}
    for severity, count in rows:
        breakdown[severity.value] = count
    return breakdown
