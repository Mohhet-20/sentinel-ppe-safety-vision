import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, utcnow


class Detection(Base):
    """
    Raw per-frame detection output — one row per detected object. This is
    intentionally separate from `Incident`: not every detection is a
    violation. The Rule Engine reads a window of Detection rows (joined with
    tracking + zone data) and decides whether to create an Incident.

    `camera_id` is nullable because ad-hoc image-upload inference (Image
    Detection page) isn't tied to a live camera — only live/webcam/video
    pipelines populate it.
    """

    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    track_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    class_name: Mapped[str] = mapped_column(String(64), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    # Normalized {"x": float, "y": float, "w": float, "h": float}, 0-1 relative to frame.
    bbox: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Denormalized request-level metadata, duplicated per detection row for
    # simple querying (e.g. "all detections from image X").
    source_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    inference_ms: Mapped[float | None] = mapped_column(Float, nullable=True)

    frame_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Detection {self.class_name} track={self.track_id} conf={self.confidence:.2f}>"
