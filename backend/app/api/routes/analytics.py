"""
Analytics endpoints — every number backed by real database queries
(see app/services/analytics_service.py). No mock data.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.analytics import (
    CameraStatEntry,
    DetectionTrendPoint,
    ExecutiveSummary,
    WorkerRiskEntry,
    ZoneRankingEntry,
)
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"], dependencies=[Depends(get_current_user)])


@router.get("/summary", response_model=ExecutiveSummary)
def get_summary(db: Session = Depends(get_db)) -> ExecutiveSummary:
    return ExecutiveSummary(**analytics_service.executive_summary(db))


@router.get("/worker-risk-ranking", response_model=list[WorkerRiskEntry])
def get_worker_risk_ranking(limit: int = 10, db: Session = Depends(get_db)) -> list[WorkerRiskEntry]:
    return [WorkerRiskEntry(**row) for row in analytics_service.worker_risk_ranking(db, limit=limit)]


@router.get("/zone-ranking", response_model=list[ZoneRankingEntry])
def get_zone_ranking(limit: int = 10, db: Session = Depends(get_db)) -> list[ZoneRankingEntry]:
    return [ZoneRankingEntry(**row) for row in analytics_service.zone_ranking(db, limit=limit)]


@router.get("/camera-statistics", response_model=list[CameraStatEntry])
def get_camera_statistics(db: Session = Depends(get_db)) -> list[CameraStatEntry]:
    return [CameraStatEntry(**row) for row in analytics_service.camera_statistics(db)]


@router.get("/detection-trends", response_model=list[DetectionTrendPoint])
def get_detection_trends(days: int = 14, db: Session = Depends(get_db)) -> list[DetectionTrendPoint]:
    return [DetectionTrendPoint(**row) for row in analytics_service.detection_trends(db, days=days)]


@router.get("/severity-breakdown", response_model=dict[str, int])
def get_severity_breakdown(db: Session = Depends(get_db)) -> dict[str, int]:
    return analytics_service.severity_breakdown(db)
