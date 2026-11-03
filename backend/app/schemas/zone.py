from pydantic import BaseModel, ConfigDict, Field

from app.models.zone import ZoneType


class ZonePoint(BaseModel):
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)


class ZoneBase(BaseModel):
    camera_id: str
    name: str
    zone_type: ZoneType = ZoneType.SAFE
    polygon: list[ZonePoint] = Field(default_factory=list, min_length=0)
    required_ppe: list[str] = Field(default_factory=list)
    priority: int = Field(1, ge=1, le=5)
    is_active: bool = True


class ZoneCreate(ZoneBase):
    pass


class ZoneUpdate(BaseModel):
    name: str | None = None
    zone_type: ZoneType | None = None
    polygon: list[ZonePoint] | None = None
    required_ppe: list[str] | None = None
    priority: int | None = Field(default=None, ge=1, le=5)
    is_active: bool | None = None


class ZoneRead(ZoneBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
