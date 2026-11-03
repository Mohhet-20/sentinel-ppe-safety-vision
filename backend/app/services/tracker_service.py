"""
Tracker Service — assigns stable track IDs to detections across frames,
records motion history, and persists TrackingSession rows.

PRODUCTION NOTE: this ships with a small dependency-free greedy IoU tracker
so the full pipeline (track IDs -> trajectory -> TrackingSession rows ->
Rule Engine -> WebSocket) is exercisable without installing the AI stack.
Once `ultralytics` is installed, swap `TrackerService.update()` to delegate
to Ultralytics' built-in ByteTrack via `model.track(source, tracker="bytetrack.yaml")`,
which returns `.boxes.id` per detection — the rest of this service (session
persistence, trajectory storage) stays the same either way.
"""
import itertools
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.tracking_session import TrackingSession, TrackingSessionStatus
from app.schemas.detection import BoundingBox, DetectedObject

_track_id_counter = itertools.count(1)


def _iou(a: dict, b: dict) -> float:
    ax1, ay1, ax2, ay2 = a["x"], a["y"], a["x"] + a["w"], a["y"] + a["h"]
    bx1, by1, bx2, by2 = b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]

    inter_x1, inter_y1 = max(ax1, bx1), max(ay1, by1)
    inter_x2, inter_y2 = min(ax2, bx2), min(ay2, by2)
    inter_area = max(0.0, inter_x2 - inter_x1) * max(0.0, inter_y2 - inter_y1)

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter_area
    return inter_area / union if union > 0 else 0.0


@dataclass
class _ActiveTrack:
    track_id: str
    class_name: str
    bbox: dict
    age: int = 0  # frames since last matched
    hits: int = 0
    trajectory: list[dict] = field(default_factory=list)


class TrackerService:
    """One instance per camera stream — tracks are not shared across cameras."""

    def __init__(self, camera_id: str, *, iou_threshold: float = 0.3, max_age: int = 30) -> None:
        self.camera_id = camera_id
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self._tracks: dict[str, _ActiveTrack] = {}

    def update(self, detections: list[DetectedObject], timestamp: datetime | None = None) -> list[DetectedObject]:
        """
        Greedy IoU association: match each detection to the best unmatched
        existing track of the same class above `iou_threshold` (a hard hat
        overlapping a person must never inherit the person's ID); unmatched detections spawn new
        tracks; unmatched existing tracks age and are dropped after `max_age`.
        Mutates and returns `detections` with `.track_id` populated.
        """
        ts = timestamp or datetime.now(timezone.utc)
        unmatched_track_ids = set(self._tracks.keys())

        for det in detections:
            best_id, best_iou = None, 0.0
            for track_id in unmatched_track_ids:
                if self._tracks[track_id].class_name != det.class_name:
                    continue
                score = _iou(self._tracks[track_id].bbox, det.bbox.model_dump())
                if score > best_iou:
                    best_id, best_iou = track_id, score

            if best_id is not None and best_iou >= self.iou_threshold:
                track = self._tracks[best_id]
                track.bbox = det.bbox.model_dump()
                track.age = 0
                track.hits += 1
                track.trajectory.append(self._point(det.bbox, ts))
                det.track_id = best_id
                unmatched_track_ids.discard(best_id)
            else:
                new_id = f"{self.camera_id[:8]}-{next(_track_id_counter)}"
                self._tracks[new_id] = _ActiveTrack(
                    track_id=new_id,
                    class_name=det.class_name,
                    bbox=det.bbox.model_dump(),
                    hits=1,
                    trajectory=[self._point(det.bbox, ts)],
                )
                det.track_id = new_id

        for track_id in unmatched_track_ids:
            self._tracks[track_id].age += 1

        stale = [tid for tid, t in self._tracks.items() if t.age > self.max_age]
        for tid in stale:
            logger.debug(f"Track {tid} on camera {self.camera_id} expired after {self.max_age} missed frames")
            del self._tracks[tid]

        return detections

    @staticmethod
    def _point(bbox: BoundingBox, ts: datetime) -> dict:
        return {"x": bbox.x + bbox.w / 2, "y": bbox.y + bbox.h / 2, "t": ts.isoformat()}

    def get_trajectory(self, track_id: str) -> list[dict]:
        track = self._tracks.get(track_id)
        return track.trajectory if track else []

    def active_track_ids(self) -> list[str]:
        return list(self._tracks.keys())

    def active_tracks_summary(self) -> list[dict]:
        """Public, broadcast-friendly view of currently active tracks."""
        return [
            {"track_id": tid, "class_name": t.class_name, "bbox": t.bbox, "age": t.age}
            for tid, t in self._tracks.items()
        ]

    def reset(self) -> None:
        self._tracks.clear()

    def persist_session(self, db: Session, track_id: str, *, worker_id: str | None = None) -> TrackingSession | None:
        """Upsert a TrackingSession row from this tracker's current state for `track_id`."""
        track = self._tracks.get(track_id)
        if track is None:
            return None

        existing = (
            db.query(TrackingSession)
            .filter(
                TrackingSession.camera_id == self.camera_id,
                TrackingSession.track_id == track_id,
                TrackingSession.status == TrackingSessionStatus.ACTIVE,
            )
            .first()
        )
        now = datetime.now(timezone.utc)

        if existing:
            existing.last_seen = now
            existing.trajectory = track.trajectory
            if worker_id:
                existing.worker_id = worker_id
            db.commit()
            db.refresh(existing)
            return existing

        session = TrackingSession(
            camera_id=self.camera_id,
            track_id=track_id,
            class_name=track.class_name,
            worker_id=worker_id,
            status=TrackingSessionStatus.ACTIVE,
            first_seen=now,
            last_seen=now,
            trajectory=track.trajectory,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session


class TrackerRegistry:
    """Holds one TrackerService per camera so callers don't manage lifetimes themselves."""

    def __init__(self) -> None:
        self._trackers: dict[str, TrackerService] = {}

    def get(self, camera_id: str) -> TrackerService:
        if camera_id not in self._trackers:
            self._trackers[camera_id] = TrackerService(camera_id)
        return self._trackers[camera_id]

    def reset(self, camera_id: str) -> None:
        self._trackers.pop(camera_id, None)


tracker_registry = TrackerRegistry()
