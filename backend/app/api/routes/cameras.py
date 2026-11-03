"""
Camera registry CRUD endpoints. Cameras only hold connection metadata here —
actual stream ingestion / inference is out of scope for this foundation.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.camera import CameraCreate, CameraRead, CameraUpdate
from app.services import camera_service

router = APIRouter(prefix="/cameras", tags=["Cameras"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CameraRead])
def list_cameras(status: str | None = None, db: Session = Depends(get_db)):
    return camera_service.list_cameras(db, status=status)


@router.get("/{camera_id}", response_model=CameraRead)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    return camera_service.get_camera(db, camera_id)


@router.post("", response_model=CameraRead, status_code=201)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    return camera_service.create_camera(db, payload)


@router.patch("/{camera_id}", response_model=CameraRead)
def update_camera(camera_id: str, payload: CameraUpdate, db: Session = Depends(get_db)):
    return camera_service.update_camera(db, camera_id, payload)


@router.delete("/{camera_id}", status_code=204)
def delete_camera(camera_id: str, db: Session = Depends(get_db)):
    camera_service.delete_camera(db, camera_id)
