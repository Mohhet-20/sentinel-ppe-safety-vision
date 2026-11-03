from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.tracking_session import TrackingSessionStatus


class TrajectoryPoint(BaseModel):
    x: float
    y: float
    t: str  # ISO timestamp


class TrackedObject(BaseModel):
    """Output of TrackerService.update() for a single tracked object this frame."""

    track_id: str
    class_name: str
    bbox: dict  # {"x","y","w","h"} normalized
    age: int
    status: TrackingSessionStatus


class TrackingSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str
    track_id: str
    class_name: str
    worker_id: str | None
    status: TrackingSessionStatus
    first_seen: datetime
    last_seen: datetime
    trajectory: list[TrajectoryPoint]
