from pydantic import BaseModel, ConfigDict

from app.models.camera import CameraStatus


class CameraBase(BaseModel):
    name: str
    source: str
    site: str | None = None
    zone: str | None = None
    status: CameraStatus = CameraStatus.OFFLINE


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: str | None = None
    source: str | None = None
    site: str | None = None
    zone: str | None = None
    status: CameraStatus | None = None


class CameraRead(CameraBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
