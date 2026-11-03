from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.incident import IncidentSeverity, IncidentStatus


class IncidentBase(BaseModel):
    camera: str
    missing_ppe: str = ""
    severity: IncidentSeverity
    confidence: float = Field(..., ge=0, le=1)
    worker_id: str | None = None
    camera_id: str | None = None
    zone_id: str | None = None
    track_id: str | None = None
    assigned_to: str | None = None
    notes: str | None = None
    screenshot_path: str | None = None


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    status: IncidentStatus | None = None
    assigned_to: str | None = None
    notes: str | None = None
    resolution: str | None = None
    severity: IncidentSeverity | None = None


class IncidentRead(IncidentBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    status: IncidentStatus
    resolution: str | None = None
