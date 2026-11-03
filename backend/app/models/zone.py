import enum
import uuid

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class ZoneType(str, enum.Enum):
    SAFE = "safe"
    RESTRICTED = "restricted"
    DANGER = "danger"
    MANDATORY_PPE = "mandatory_ppe"


class Zone(TimestampMixin, Base):
    """
    A named polygon region on a specific camera's frame. The Rule Engine
    checks tracked detections against each active zone on that camera to
    decide whether required PPE is present or whether the zone itself
    (restricted/danger) was breached.
    """

    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id: Mapped[str] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(128), nullable=False)
    zone_type: Mapped[ZoneType] = mapped_column(Enum(ZoneType), default=ZoneType.SAFE, nullable=False)

    # List of {"x": float, "y": float} points, normalized 0-1 relative to frame size,
    # so the polygon stays valid regardless of camera resolution.
    polygon: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # e.g. ["hardhat", "vest", "goggles"] — classes that must be present on any
    # person detection whose center falls inside this zone.
    required_ppe: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # 1 (low) .. 5 (critical) — used to pick a winning zone when polygons overlap
    # and to help set the severity of any incident the Rule Engine generates.
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Zone {self.name} ({self.zone_type}) on camera {self.camera_id}>"
