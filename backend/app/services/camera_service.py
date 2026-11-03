from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate


def list_cameras(db: Session, *, status: str | None = None) -> list[Camera]:
    stmt = select(Camera)
    if status and status != "all":
        stmt = stmt.where(Camera.status == status)
    return list(db.execute(stmt.order_by(Camera.name)).scalars())


def get_camera(db: Session, camera_id: str) -> Camera:
    camera = db.get(Camera, camera_id)
    if camera is None:
        raise NotFoundError(f"Camera '{camera_id}' not found")
    return camera


def create_camera(db: Session, data: CameraCreate) -> Camera:
    camera = Camera(**data.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


def update_camera(db: Session, camera_id: str, data: CameraUpdate) -> Camera:
    camera = get_camera(db, camera_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(camera, field, value)
    db.commit()
    db.refresh(camera)
    return camera


def delete_camera(db: Session, camera_id: str) -> None:
    camera = get_camera(db, camera_id)
    db.delete(camera)
    db.commit()
