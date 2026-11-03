"""
Zone Engine CRUD endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.zone import ZoneCreate, ZoneRead, ZoneUpdate
from app.services import zone_service

router = APIRouter(prefix="/zones", tags=["Zones"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ZoneRead])
def list_zones(camera_id: str | None = None, active_only: bool = False, db: Session = Depends(get_db)):
    return zone_service.list_zones(db, camera_id=camera_id, active_only=active_only)


@router.get("/{zone_id}", response_model=ZoneRead)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    return zone_service.get_zone(db, zone_id)


@router.post("", response_model=ZoneRead, status_code=201)
def create_zone(payload: ZoneCreate, db: Session = Depends(get_db)):
    return zone_service.create_zone(db, payload)


@router.patch("/{zone_id}", response_model=ZoneRead)
def update_zone(zone_id: str, payload: ZoneUpdate, db: Session = Depends(get_db)):
    return zone_service.update_zone(db, zone_id, payload)


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: str, db: Session = Depends(get_db)):
    zone_service.delete_zone(db, zone_id)
