import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, utcnow


class IncidentSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Incident(TimestampMixin, Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("workers.id"), nullable=True)
    camera_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    track_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    camera: Mapped[str] = mapped_column(String(128), nullable=False)  # denormalized label for quick display
    missing_ppe: Mapped[str] = mapped_column(String(255), default="", nullable=False)  # comma-separated
    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    assigned_to: Mapped[str | None] = mapped_column(String(128), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_path: Mapped[str | None] = mapped_column(String(255), nullable=True)

    worker: Mapped["Worker | None"] = relationship("Worker", lazy="joined")  # noqa: F821

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Incident {self.id} {self.severity}>"
