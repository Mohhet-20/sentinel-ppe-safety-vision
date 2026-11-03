"""Zone-aware enforcement in the live pipeline (services/zone_enforcement.py)."""
import uuid

import pytest

from app.models.camera import Camera, CameraStatus
from app.models.zone import Zone, ZoneType
from app.schemas.detection import BoundingBox, DetectedObject
from app.services.tracker_service import TrackerService
from app.services.zone_enforcement import camera_has_policies, enforce_frame, ppe_for_person
from tests.conftest import TestingSessionLocal

LEFT_HALF = [{"x": 0.0, "y": 0.0}, {"x": 0.5, "y": 0.0}, {"x": 0.5, "y": 1.0}, {"x": 0.0, "y": 1.0}]
RIGHT_HALF = [{"x": 0.5, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 1.0, "y": 1.0}, {"x": 0.5, "y": 1.0}]


def det(cls: str, x: float, y: float, w: float, h: float, track: str | None = None, conf: float = 0.9) -> DetectedObject:
    return DetectedObject(class_id=0, class_name=cls, confidence=conf, bbox=BoundingBox(x=x, y=y, w=w, h=h), track_id=track)


# A person on the left (x 0.10–0.30) and one on the right (x 0.70–0.90).
LEFT_PERSON = det("Person", 0.10, 0.30, 0.20, 0.60, track="p-left")
RIGHT_PERSON = det("Person", 0.70, 0.30, 0.20, 0.60, track="p-right")
LEFT_HELMET = det("Hardhat", 0.15, 0.26, 0.10, 0.08)  # sits slightly above the left person's box
RIGHT_HELMET = det("Hardhat", 0.75, 0.26, 0.10, 0.08)


@pytest.fixture
def db():
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture
def camera(db):
    cam = Camera(name=f"CAM-T · {uuid.uuid4().hex[:6]}", source="rtsp://test", site="Test", zone="Z", status=CameraStatus.ONLINE)
    db.add(cam)
    db.commit()
    db.refresh(cam)
    return cam


def add_zone(db, camera, polygon, zone_type, required_ppe):
    zone = Zone(camera_id=camera.id, name=f"{zone_type.value}-zone", zone_type=zone_type, polygon=polygon, required_ppe=required_ppe, priority=2)
    db.add(zone)
    db.commit()
    return zone


# --------------------------------------------------------------- association


def test_ppe_attaches_to_the_person_wearing_it():
    assert ppe_for_person(LEFT_PERSON, [LEFT_HELMET, RIGHT_HELMET]) == [LEFT_HELMET]
    assert ppe_for_person(RIGHT_PERSON, [LEFT_HELMET, RIGHT_HELMET]) == [RIGHT_HELMET]


def test_ppe_elsewhere_in_frame_is_not_attached():
    assert ppe_for_person(LEFT_PERSON, [RIGHT_HELMET]) == []


# --------------------------------------------------------------- enforcement


def test_missing_ppe_in_mandatory_zone_raises_incident(db, camera):
    add_zone(db, camera, LEFT_HALF, ZoneType.MANDATORY_PPE, ["hardhat"])
    result = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON], seen=set())
    assert [i.missing_ppe for i in result.created] == ["Missing Hardhat"]
    assert result.created[0].zone_id is not None


def test_helmet_on_someone_else_does_not_satisfy_the_rule(db, camera):
    """Regression: PPE used to be matched against every detection in the frame."""
    add_zone(db, camera, LEFT_HALF, ZoneType.MANDATORY_PPE, ["hardhat"])
    result = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON, RIGHT_HELMET], seen=set())
    assert [i.missing_ppe for i in result.created] == ["Missing Hardhat"]


def test_compliant_worker_raises_nothing(db, camera):
    add_zone(db, camera, LEFT_HALF, ZoneType.MANDATORY_PPE, ["hardhat"])
    result = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON, LEFT_HELMET], seen=set())
    assert result.created == []


def test_violations_are_deduplicated_across_frames(db, camera):
    add_zone(db, camera, LEFT_HALF, ZoneType.MANDATORY_PPE, ["hardhat"])
    seen: set = set()
    first = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON], seen=seen)
    second = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON], seen=seen)
    assert len(first.created) == 1
    assert second.created == []


def test_restricted_zone_entry_is_a_violation(db, camera):
    add_zone(db, camera, RIGHT_HALF, ZoneType.RESTRICTED, [])
    result = enforce_frame(db, camera=camera, boxes=[RIGHT_PERSON, RIGHT_HELMET], seen=set())
    labels = [i.missing_ppe for i in result.created]
    assert "Restricted Zone Entry" in labels


def test_global_rules_apply_outside_any_zone(db, camera):
    """Regression: global rules (camera_id NULL) were filtered out during evaluation."""
    assert camera_has_policies(db, camera.id)  # seeded site-wide hard hat / vest rules
    result = enforce_frame(db, camera=camera, boxes=[LEFT_PERSON, LEFT_HELMET], seen=set())
    labels = {i.missing_ppe for i in result.created}
    # Other tests may add more global rules to the shared DB, so check membership.
    assert "Missing Vest" in labels
    assert "Missing Hardhat" not in labels  # worn, so satisfied


# --------------------------------------------------------------- tracker


def test_tracker_never_matches_across_classes():
    tracker = TrackerService("cam-test")
    person = det("Person", 0.1, 0.1, 0.3, 0.6)
    tracker.update([person])
    helmet_same_spot = det("Hardhat", 0.1, 0.1, 0.3, 0.6)
    tracker.update([helmet_same_spot])
    assert helmet_same_spot.track_id != person.track_id


# --------------------------------------------------------------- API


def _auth(client):
    token = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_webcam_session_can_bind_to_a_site_camera(client, camera):
    response = client.post("/api/inference/webcam/start", data={"camera_id": camera.id}, headers=_auth(client))
    assert response.status_code == 200
    assert response.json()["camera_id"] == camera.id


def test_webcam_session_rejects_unknown_camera(client):
    response = client.post("/api/inference/webcam/start", data={"camera_id": "nope"}, headers=_auth(client))
    assert response.status_code == 404
