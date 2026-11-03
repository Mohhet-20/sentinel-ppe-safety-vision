from app.schemas.detection import BoundingBox, DetectedObject
from app.services.tracker_service import TrackerService


def _det(x: float) -> DetectedObject:
    return DetectedObject(class_id=0, class_name="person", confidence=0.9, bbox=BoundingBox(x=x, y=0.1, w=0.1, h=0.2))


def test_new_detection_gets_track_id():
    tracker = TrackerService(camera_id="cam-1")
    detections = [_det(0.1)]
    tracker.update(detections)
    assert detections[0].track_id is not None


def test_same_position_reuses_track_id():
    tracker = TrackerService(camera_id="cam-1")
    first = [_det(0.1)]
    tracker.update(first)
    track_id_1 = first[0].track_id

    second = [_det(0.11)]  # nearly identical bbox -> should match via IoU
    tracker.update(second)
    assert second[0].track_id == track_id_1


def test_trajectory_grows_over_updates():
    tracker = TrackerService(camera_id="cam-1")
    det = [_det(0.1)]
    tracker.update(det)
    tracker.update([_det(0.1)])
    trajectory = tracker.get_trajectory(det[0].track_id)
    assert len(trajectory) == 2
