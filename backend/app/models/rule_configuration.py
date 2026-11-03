import enum
import uuid

from sqlalchemy import JSON, Boolean, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin
from app.models.incident import IncidentSeverity


class RuleType(str, enum.Enum):
    PPE_REQUIRED = "ppe_required"
    ZONE_RESTRICTED = "zone_restricted"
    ZONE_DANGER = "zone_danger"
    CUSTOM = "custom"


class Shift(str, enum.Enum):
    DAY = "day"
    SWING = "swing"
    NIGHT = "night"
    ALL = "all"


class RuleConfiguration(TimestampMixin, Base):
    """
    A configurable safety rule the Rule Engine evaluates against tracked
    detections. Rules can be global (camera_id/zone_id null), scoped to a
    camera, or scoped to a specific zone (which typically already carries
    its own `required_ppe`, but a rule can override/extend that).

    Examples: "Helmet required", "Vest required", "No entry — Danger Zone".
    """

    __tablename__ = "rule_configurations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    rule_type: Mapped[RuleType] = mapped_column(Enum(RuleType), nullable=False)

    camera_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("cameras.id"), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("zones.id"), nullable=True)
    shift: Mapped[Shift] = mapped_column(Enum(Shift), default=Shift.ALL, nullable=False)

    # For PPE_REQUIRED rules: classes that must be present, e.g. ["hardhat", "vest", "boots"].
    required_ppe: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    severity: Mapped[IncidentSeverity] = mapped_column(Enum(IncidentSeverity), default=IncidentSeverity.MEDIUM, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Minimum detector confidence for this rule to fire.
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    # A violation must persist for this many seconds before an incident is raised
    # (prevents one flickering frame from creating an incident).
    debounce_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Additional delay before an alert/notification fires after the incident is created.
    alert_delay_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<RuleConfiguration {self.name} ({self.rule_type})>"
