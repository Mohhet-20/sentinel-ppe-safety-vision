from pydantic import BaseModel, Field


class ResourceGauge(BaseModel):
    label: str
    value: float
    unit: str = "%"
    status: str = "ok"  # ok | warn | critical | unknown
    detail: str | None = None


class DependencyHealth(BaseModel):
    name: str
    status: str  # ok | degraded | down | unknown
    latency_ms: float | None = None
    detail: str | None = None


class SystemHealth(BaseModel):
    status: str = Field(..., description="Overall roll-up: ok | degraded | critical")
    app: str
    version: str
    environment: str
    uptime_seconds: float
    timestamp: str
    resources: list[ResourceGauge]
    dependencies: list[DependencyHealth]
    cameras_total: int = 0
    cameras_online: int = 0
    websocket_connections: int = 0
    model_loaded: bool = False
    model_device: str | None = None
