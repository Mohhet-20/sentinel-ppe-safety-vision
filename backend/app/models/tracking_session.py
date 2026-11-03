import enum
import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, utcnow


class TrackingSessionStatus(str, enum.Enum):
    ACTIVE = "active"
    LOST = "lost"
    ENDED = "ended"


class TrackingSession(TimestampMixin, Base):
    """
    One row per tracked object lifecycle on a camera (a ByteTrack `track_id`
    from first appearance to loss/end). Stores the running motion history
    ("trajectory") so the frontend can draw a worker's path and the Rule
    Engine can evaluate dwell time / zone entry over time rather than a
    single frame.
    """

    __tablename__ = "tracking_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id: Mapped[str] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=False)
    track_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    class_name: Mapped[str] = mapped_column(String(64), default="person", nullable=False)
    # Attribution to a known Worker is best-effort and often set after the fact
    # (badge correlation / manual assignment) — vision-only re-ID is out of scope.
    worker_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("workers.id"), nullable=True)

    status: Mapped[TrackingSessionStatus] = mapped_column(
        Enum(TrackingSessionStatus), default=TrackingSessionStatus.ACTIVE, nullable=False
    )

    first_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    # List of {"x": float, "y": float, "t": iso-timestamp} points — the motion history.
    trajectory: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<TrackingSession cam={self.camera_id} track={self.track_id} status={self.status}>"
