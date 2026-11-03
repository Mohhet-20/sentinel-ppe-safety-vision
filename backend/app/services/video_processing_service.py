"""
Orchestrates the full video inference pipeline:

    validate -> open capture -> per-frame [YOLO inference -> ByteTrack-style
    tracking -> draw boxes/track IDs -> write to output video] -> aggregate
    stats -> auto-generate PPE-violation incidents -> return summary.

Kept separate from InferenceService (which stays a thin per-frame model
wrapper) so this orchestration layer can evolve — e.g. swap in real
Ultralytics ByteTrack (`model.track(..., tracker="bytetrack.yaml")`)
without touching the model-loading code.
"""
import time
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.schemas.detection import IncidentSummaryEntry, VideoInferenceResult, VideoTimelineEvent
from app.services.inference_service import inference_service
from app.services.ppe_incident_rules import classify_violation, generate_incidents_from_detections
from app.services.tracker_service import TrackerService
from app.utils.annotate import draw_boxes_on_frame
from app.utils.video_validation import open_video_capture


@dataclass
class _RunningStats:
    total_detections: int = 0
    confidence_sum: float = 0.0
    frames_processed: int = 0
    seen_track_ids: set = None  # type: ignore[assignment]

    def __post_init__(self):
        if self.seen_track_ids is None:
            self.seen_track_ids = set()


def process_video_file(
    db: Session,
    *,
    source_path: Path,
    output_dir: Path,
    source_label: str,
    sample_every_n_frames: int = 1,
    max_timeline_events: int = 200,
) -> VideoInferenceResult:
    overall_start = time.perf_counter()

    if not inference_service.ensure_ready():
        message = inference_service.load_error or "No model is currently loaded."
        logger.warning(f"Video processing rejected for '{source_path.name}' — model not loaded: {message}")
        return VideoInferenceResult(status="model_not_loaded", message=message)

    capture = open_video_capture(source_path)
    # cv2.CAP_PROP_FPS == 5, but avoid importing cv2 at module scope for typing.
    # Some containers/codecs (and, per observation, this exact OpenCV/FFmpeg
    # build under sustained use) report a nonsensical-but-truthy FPS (e.g.
    # in the hundreds of millions) — `or 25.0` alone only catches 0/None, not
    # that. An invalid FPS here silently breaks two things downstream: every
    # timeline event's time_sec collapses to ~0 (frame_index / huge_fps), and
    # cv2.VideoWriter refuses to open with a rejected timebase, so it writes
    # a 0-byte "annotated" video with no error raised. Clamp to a sane range.
    raw_fps = capture.get(6)
    source_fps = raw_fps if raw_fps and 1.0 <= raw_fps <= 240.0 else 25.0
    total_frames = int(capture.get(7) or 0)  # cv2.CAP_PROP_FRAME_COUNT == 7
    frame_width = int(capture.get(3) or 0)  # cv2.CAP_PROP_FRAME_WIDTH == 3
    frame_height = int(capture.get(4) or 0)  # cv2.CAP_PROP_FRAME_HEIGHT == 4

    import cv2  # noqa: PLC0415  (safe now — open_video_capture already confirmed opencv is importable)

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{source_path.stem}_annotated.mp4"
    # "mp4v" (MPEG-4 Part 2) writes successfully but no mainstream browser can
    # decode it in an HTML5 <video> element (Chrome: DEMUXER_ERROR_NO_SUPPORTED_STREAMS) —
    # the annotated video would silently fail to play regardless of whether
    # detection/annotation succeeded. "avc1" (H.264) is broadly browser-playable.
    writer = cv2.VideoWriter(str(output_path), cv2.VideoWriter_fourcc(*"avc1"), source_fps, (frame_width, frame_height))

    tracker = TrackerService(camera_id=f"video:{source_path.stem}")
    stats = _RunningStats()
    timeline: list[VideoTimelineEvent] = []
    seen_violations: set[tuple[str, str]] = set()
    incident_summary: dict[str, int] = {}
    incident_ids: list[str] = []

    frame_index = 0
    dropped_frames = 0

    logger.info(
        f"Video processing started: '{source_path.name}' ({total_frames} frames @ {source_fps:.1f}fps, "
        f"{frame_width}x{frame_height})"
    )

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break

            if frame is None or frame.size == 0:
                dropped_frames += 1
                logger.warning(f"Dropped unreadable frame {frame_index} in '{source_path.name}'")
                frame_index += 1
                continue

            if frame_index % sample_every_n_frames == 0:
                boxes, _inference_ms = inference_service.predict_frame(frame)
                tracker.update(boxes)

                stats.total_detections += len(boxes)
                stats.confidence_sum += sum(b.confidence for b in boxes)
                stats.frames_processed += 1
                for b in boxes:
                    if b.track_id:
                        stats.seen_track_ids.add(b.track_id)

                time_sec = frame_index / (source_fps or 25.0)
                for b in boxes:
                    classification = classify_violation(b.class_name)
                    if classification and len(timeline) < max_timeline_events:
                        label, severity = classification
                        timeline.append(
                            VideoTimelineEvent(
                                time_sec=round(time_sec, 2),
                                class_name=b.class_name,
                                confidence=b.confidence,
                                track_id=b.track_id,
                                severity=severity.value,
                            )
                        )

                draw_boxes_on_frame(frame, boxes)

                generation = generate_incidents_from_detections(
                    db,
                    boxes=boxes,
                    source_label=source_label,
                    seen_violations=seen_violations,
                    frame=frame,
                )
                for incident in generation.created:
                    incident_ids.append(incident.id)
                for label, count in generation.summary.items():
                    incident_summary[label] = incident_summary.get(label, 0) + count

            writer.write(frame)
            frame_index += 1
    finally:
        capture.release()
        writer.release()

    if dropped_frames:
        logger.warning(f"Video '{source_path.name}' had {dropped_frames} dropped/unreadable frames")

    processing_time_ms = (time.perf_counter() - overall_start) * 1000
    duration_sec = frame_index / (source_fps or 25.0)
    processing_fps = frame_index / (processing_time_ms / 1000) if processing_time_ms > 0 else 0.0
    average_confidence = stats.confidence_sum / stats.total_detections if stats.total_detections else 0.0

    logger.info(
        f"Video processing finished: '{source_path.name}' — {stats.total_detections} detections across "
        f"{stats.frames_processed} sampled frames, {len(stats.seen_track_ids)} unique tracks, "
        f"{len(incident_ids)} incidents, {processing_time_ms:.0f}ms total"
    )

    return VideoInferenceResult(
        status="ok",
        processed_video_url=f"/uploads/videos/annotated/{output_path.name}",
        original_video_url=f"/uploads/videos/{source_path.name}",
        total_frames=total_frames,
        frames_processed=stats.frames_processed,
        total_detections=stats.total_detections,
        unique_tracks=len(stats.seen_track_ids),
        average_confidence=round(average_confidence, 3),
        processing_fps=round(processing_fps, 1),
        source_fps=round(source_fps, 1),
        duration_sec=round(duration_sec, 1),
        processing_time_ms=round(processing_time_ms, 1),
        timeline=timeline,
        incident_summary=[IncidentSummaryEntry(label=k, count=v) for k, v in incident_summary.items()],
        incident_ids=incident_ids,
    )
