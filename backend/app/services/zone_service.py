"""
Zone Engine — CRUD for camera zones plus the geometry needed to resolve
which zone (if any) a detection's center point falls inside.

Uses a dependency-free ray-casting point-in-polygon test rather than pulling
in shapely, since this project's polygons are simple (non-self-intersecting)
and normalized to 0-1 frame coordinates.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.zone import Zone
from app.schemas.zone import ZoneCreate, ZoneUpdate


def list_zones(db: Session, *, camera_id: str | None = None, active_only: bool = False) -> list[Zone]:
    stmt = select(Zone)
    if camera_id:
        stmt = stmt.where(Zone.camera_id == camera_id)
    if active_only:
        stmt = stmt.where(Zone.is_active.is_(True))
    return list(db.execute(stmt.order_by(Zone.priority.desc(), Zone.name)).scalars())


def get_zone(db: Session, zone_id: str) -> Zone:
    zone = db.get(Zone, zone_id)
    if zone is None:
        raise NotFoundError(f"Zone '{zone_id}' not found")
    return zone


def create_zone(db: Session, data: ZoneCreate) -> Zone:
    payload = data.model_dump()
    payload["polygon"] = [p for p in payload["polygon"]]  # already plain dicts via model_dump
    zone = Zone(**payload)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


def update_zone(db: Session, zone_id: str, data: ZoneUpdate) -> Zone:
    zone = get_zone(db, zone_id)
    updates = data.model_dump(exclude_unset=True)
    if "polygon" in updates and updates["polygon"] is not None:
        updates["polygon"] = [p if isinstance(p, dict) else p.model_dump() for p in updates["polygon"]]
    for field, value in updates.items():
        setattr(zone, field, value)
    db.commit()
    db.refresh(zone)
    return zone


def delete_zone(db: Session, zone_id: str) -> None:
    zone = get_zone(db, zone_id)
    db.delete(zone)
    db.commit()


def point_in_polygon(point: tuple[float, float], polygon: list[dict]) -> bool:
    """
    Standard ray-casting test. `polygon` is a list of {"x": float, "y": float}
    dicts (normalized 0-1). Returns True if `point` lies inside.
    """
    if len(polygon) < 3:
        return False

    x, y = point
    inside = False
    n = len(polygon)
    x1, y1 = polygon[0]["x"], polygon[0]["y"]

    for i in range(1, n + 1):
        x2, y2 = polygon[i % n]["x"], polygon[i % n]["y"]
        if y > min(y1, y2) and y <= max(y1, y2) and x <= max(x1, x2) and y1 != y2:
            x_intersect = (y - y1) * (x2 - x1) / (y2 - y1) + x1
            if x1 == x2 or x <= x_intersect:
                inside = not inside
        x1, y1 = x2, y2

    return inside


def bbox_center(bbox: dict) -> tuple[float, float]:
    return (bbox["x"] + bbox["w"] / 2, bbox["y"] + bbox["h"] / 2)


def resolve_zone_for_bbox(db: Session, camera_id: str, bbox: dict) -> Zone | None:
    """
    Returns the highest-priority active zone on `camera_id` whose polygon
    contains the bbox's center point, or None if the point isn't in any zone.
    """
    zones = list_zones(db, camera_id=camera_id, active_only=True)
    center = bbox_center(bbox)
    for zone in zones:  # already ordered by priority desc
        if point_in_polygon(center, zone.polygon):
            return zone
    return None
