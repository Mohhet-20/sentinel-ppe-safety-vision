"""
Server-side state for a "live webcam" session. The camera itself lives in
the browser (getUserMedia) — the frontend starts a session, then repeatedly
posts captured frames to POST /api/inference/webcam with the session_id,
so tracking IDs, incident dedup, and FPS/latency stats stay continuous
across the whole session rather than resetting every frame.

(Swap point for a server-attached camera: replace the frame-relay loop with
`cv2.VideoCapture(device_index)` inside a background task that calls
`WebcamSession.ingest_frame()` directly — the session/tracking/telemetry
plumbing here doesn't change either way.)
"""
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.core.logging import logger
from app.services.tracker_service import TrackerService

_STATS_WINDOW = 60


@dataclass
class WebcamSession:
    session_id: str
    camera_label: str
    started_at: datetime
    tracker: TrackerService
    # When bound to a site camera, frames are enforced against that camera's
    # zones and rules (see zone_enforcement.py) instead of the generic PPE rules.
    camera_id: str | None = None
    ended_at: datetime | None = None
    is_active: bool = True
    frame_count: int = 0
    detection_count: int = 0
    last_updated: datetime | None = None
    fps_samples: deque = field(default_factory=lambda: deque(maxlen=_STATS_WINDOW))
    latency_samples: deque = field(default_factory=lambda: deque(maxlen=_STATS_WINDOW))
    seen_violations: set = field(default_factory=set)

    def record_frame(self, *, detections: int, fps: float, latency_ms: float) -> None:
        self.frame_count += 1
        self.detection_count += detections
        self.fps_samples.append(fps)
        self.latency_samples.append(latency_ms)
        self.last_updated = datetime.now(timezone.utc)

    def status_dict(self) -> dict:
        avg_fps = round(sum(self.fps_samples) / len(self.fps_samples), 1) if self.fps_samples else 0.0
        avg_latency = round(sum(self.latency_samples) / len(self.latency_samples), 2) if self.latency_samples else 0.0
        return {
            "session_id": self.session_id,
            "camera_id": self.camera_id,
            "is_active": self.is_active,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "frame_count": self.frame_count,
            "detection_count": self.detection_count,
            "unique_tracks": len(self.tracker.active_track_ids()),
            "avg_fps": avg_fps,
            "avg_latency_ms": avg_latency,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }


class WebcamSessionRegistry:
    def __init__(self) -> None:
        self._sessions: dict[str, WebcamSession] = {}

    def start(self, camera_label: str = "Browser Webcam", camera_id: str | None = None) -> WebcamSession:
        session_id = str(uuid.uuid4())
        session = WebcamSession(
            session_id=session_id,
            camera_label=camera_label,
            started_at=datetime.now(timezone.utc),
            tracker=TrackerService(camera_id=f"webcam:{session_id[:8]}"),
            camera_id=camera_id,
        )
        self._sessions[session_id] = session
        logger.info(f"Webcam session started: {session_id} ({camera_label})")
        return session

    def get(self, session_id: str) -> WebcamSession | None:
        return self._sessions.get(session_id)

    def stop(self, session_id: str) -> WebcamSession | None:
        session = self._sessions.get(session_id)
        if session is None:
            return None
        session.is_active = False
        session.ended_at = datetime.now(timezone.utc)
        logger.info(
            f"Webcam session stopped: {session_id} — {session.frame_count} frames, "
            f"{session.detection_count} detections"
        )
        return session

    def latest_active(self) -> WebcamSession | None:
        """Convenience for a single-camera frontend that doesn't track session_id explicitly."""
        active = [s for s in self._sessions.values() if s.is_active]
        return max(active, key=lambda s: s.started_at) if active else None


webcam_sessions = WebcamSessionRegistry()
