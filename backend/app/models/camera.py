import enum
import uuid

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class CameraStatus(str, enum.Enum):
    ONLINE = "online"
    DEGRADED = "degraded"
    OFFLINE = "offline"


class Camera(TimestampMixin, Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # RTSP/HTTP stream URL, device index, or file path — inference is not wired up yet.
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    site: Mapped[str | None] = mapped_column(String(128), nullable=True)
    zone: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[CameraStatus] = mapped_column(Enum(CameraStatus), default=CameraStatus.OFFLINE, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Camera {self.name} ({self.status})>"
