from pydantic import BaseModel


class ExecutiveSummary(BaseModel):
    live_compliance: float
    todays_violations: int
    weekly_violations: int
    monthly_violations: int
    average_confidence: float
    fps: float
    latency_ms: float
    model_loaded: bool


class WorkerRiskEntry(BaseModel):
    id: str
    name: str
    department: str
    risk_score: float
    compliance_score: float


class ZoneRankingEntry(BaseModel):
    id: str
    name: str
    zone_type: str
    violation_count: int


class CameraStatEntry(BaseModel):
    id: str
    name: str
    status: str
    violation_count: int


class DetectionTrendPoint(BaseModel):
    day: str
    count: int
