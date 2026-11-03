from pydantic import BaseModel, ConfigDict, Field

from app.models.incident import IncidentSeverity
from app.models.rule_configuration import RuleType, Shift


class RuleConfigurationBase(BaseModel):
    name: str
    rule_type: RuleType
    camera_id: str | None = None
    zone_id: str | None = None
    shift: Shift = Shift.ALL
    required_ppe: list[str] = Field(default_factory=list)
    severity: IncidentSeverity = IncidentSeverity.MEDIUM
    is_active: bool = True
    confidence_threshold: float = Field(0.5, ge=0, le=1)
    debounce_seconds: int = Field(0, ge=0, le=3600)
    alert_delay_seconds: int = Field(0, ge=0, le=3600)


class RuleConfigurationCreate(RuleConfigurationBase):
    pass


class RuleConfigurationUpdate(BaseModel):
    name: str | None = None
    rule_type: RuleType | None = None
    camera_id: str | None = None
    zone_id: str | None = None
    shift: Shift | None = None
    required_ppe: list[str] | None = None
    severity: IncidentSeverity | None = None
    is_active: bool | None = None
    confidence_threshold: float | None = Field(default=None, ge=0, le=1)
    debounce_seconds: int | None = Field(default=None, ge=0, le=3600)
    alert_delay_seconds: int | None = Field(default=None, ge=0, le=3600)


class RuleConfigurationRead(RuleConfigurationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class IncidentPayload(BaseModel):
    """What the Rule Engine hands off to incident creation when a rule fires."""

    camera_id: str
    camera: str
    zone_id: str | None = None
    track_id: str | None = None
    worker_id: str | None = None
    missing_ppe: str = ""
    severity: IncidentSeverity
    confidence: float
    notes: str | None = None
