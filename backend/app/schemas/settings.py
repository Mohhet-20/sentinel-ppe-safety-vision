from pydantic import BaseModel, Field


class DetectionSettings(BaseModel):
    confidence_threshold: float = Field(0.5, ge=0, le=1)
    iou_threshold: float = Field(0.45, ge=0, le=1)
    tracker: str = Field("bytetrack", examples=["bytetrack", "deepsort", "none"])
    max_tracking_age: int = Field(30, ge=1, le=600)


class AlertSettings(BaseModel):
    email_alerts: bool = True
    push_alerts: bool = True
    sms_alerts: bool = False
    min_severity: str = Field("medium", examples=["low", "medium", "high", "critical"])


class ReportSettings(BaseModel):
    auto_generate_daily: bool = True
    recipients: list[str] = Field(default_factory=list)


class SystemSettings(BaseModel):
    detection: DetectionSettings = DetectionSettings()
    alerts: AlertSettings = AlertSettings()
    reports: ReportSettings = ReportSettings()
