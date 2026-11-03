"""
Inference endpoints.

/image   — validate -> YOLO -> annotate -> persist Detection rows -> respond
/video   — validate -> full VideoProcessingService pipeline (tracking,
           annotated output video, incident generation, timeline)
/webcam/start|stop|status — server-side session bookkeeping for the
           browser-camera-fed live pipeline (see webcam_session_service.py)
/webcam  — a single frame POSTed against an (optional) session_id; runs
           inference + tracking + incident generation + WS broadcast

All routes fail clearly (503) rather than silently when no model is loaded.
"""
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import logger
from app.database.session import get_db
from app.models.camera import Camera
from app.schemas.detection import InferenceResult, VideoInferenceResult, WebcamSessionStatus
from app.services.detection_log_service import save_detections
from app.services.inference_service import inference_service
from app.services.ppe_incident_rules import generate_incidents_from_detections
from app.services.video_processing_service import process_video_file
from app.services.webcam_session_service import webcam_sessions
from app.services.zone_enforcement import camera_has_policies, enforce_frame
from app.utils.annotate import annotate_image
from app.utils.files import save_upload
from app.utils.image_validation import (
    read_image_dimensions,
    validate_saved_file_size,
    validate_upload_metadata,
)
from app.utils.video_validation import validate_saved_video_size, validate_video_upload_metadata
from app.websocket.broadcaster import broadcast_detections, broadcast_incident, broadcast_telemetry, broadcast_tracking_update

router = APIRouter(prefix="/inference", tags=["Inference"], dependencies=[Depends(get_current_user)])


class ModelNotLoadedError(AppError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="model_not_loaded", status_code=503)


# ------------------------------------------------------------------------ #
# Image
# ------------------------------------------------------------------------ #
@router.post("/image", response_model=InferenceResult)
async def infer_image(file: UploadFile = File(...), db: Session = Depends(get_db)) -> InferenceResult:
    validate_upload_metadata(file)

    path = await save_upload(file, subdir="images")
    validate_saved_file_size(path)
    width, height = read_image_dimensions(path)

    result = inference_service.predict_image(path)
    if result.status == "model_not_loaded":
        logger.error(f"Inference rejected — model not loaded ({result.message})")
        raise ModelNotLoadedError(
            result.message or f"Detection model is not loaded. Place a checkpoint at '{settings.model_path}'."
        )

    result.image_width = width
    result.image_height = height
    result.original_image_url = f"/uploads/images/{path.name}"

    try:
        annotated_dir = settings.upload_path / "images" / "annotated"
        annotated_path = annotate_image(path, result.boxes, output_dir=annotated_dir)
        result.annotated_image_url = f"/uploads/images/annotated/{annotated_path.name}"
    except Exception:  # noqa: BLE001
        logger.exception(f"Annotation failed for '{path.name}'")

    saved = save_detections(db, boxes=result.boxes, source_name=file.filename, inference_ms=result.inference_ms)
    result.detection_ids = [row.id for row in saved]

    logger.info(f"POST /inference/image '{file.filename}' -> {len(result.boxes)} detections, {result.inference_ms}ms")
    await broadcast_telemetry({"source": "inference/image", "fps": result.fps, "inference_ms": result.inference_ms})
    return result


# ------------------------------------------------------------------------ #
# Video
# ------------------------------------------------------------------------ #
@router.post("/video", response_model=VideoInferenceResult)
async def infer_video(file: UploadFile = File(...), db: Session = Depends(get_db)) -> VideoInferenceResult:
    validate_video_upload_metadata(file)

    path = await save_upload(file, subdir="videos")
    validate_saved_video_size(path)

    logger.info(f"POST /inference/video '{file.filename}' — starting processing")
    result = process_video_file(
        db,
        source_path=path,
        output_dir=settings.upload_path / "videos" / "annotated",
        source_label=f"Uploaded video: {file.filename}",
    )

    if result.status == "model_not_loaded":
        raise ModelNotLoadedError(
            result.message or f"Detection model is not loaded. Place a checkpoint at '{settings.model_path}'."
        )

    await broadcast_telemetry(
        {"source": "inference/video", "fps": result.processing_fps, "inference_ms": result.processing_time_ms}
    )
    for label_entry in result.incident_summary:
        await broadcast_incident({"source": file.filename, "label": label_entry.label, "count": label_entry.count})

    return result


# ------------------------------------------------------------------------ #
# Webcam session lifecycle
# ------------------------------------------------------------------------ #
@router.post("/webcam/start", response_model=WebcamSessionStatus)
async def start_webcam_session(
    camera_label: str = Form("Browser Webcam"),
    camera_id: str | None = Form(None),
    db: Session = Depends(get_db),
) -> WebcamSessionStatus:
    if camera_id:
        camera = db.get(Camera, camera_id)
        if camera is None:
            raise NotFoundError(f"Camera '{camera_id}' not found")
        camera_label = camera.name
    session = webcam_sessions.start(camera_label=camera_label, camera_id=camera_id)
    return WebcamSessionStatus(**session.status_dict())


@router.post("/webcam/stop", response_model=WebcamSessionStatus)
async def stop_webcam_session(session_id: str = Form(...)) -> WebcamSessionStatus:
    session = webcam_sessions.stop(session_id)
    if session is None:
        raise NotFoundError(f"Webcam session '{session_id}' not found")
    return WebcamSessionStatus(**session.status_dict())


@router.get("/webcam/status", response_model=WebcamSessionStatus)
async def webcam_session_status(session_id: str | None = None) -> WebcamSessionStatus:
    session = webcam_sessions.get(session_id) if session_id else webcam_sessions.latest_active()
    if session is None:
        return WebcamSessionStatus(is_active=False)
    return WebcamSessionStatus(**session.status_dict())


# ------------------------------------------------------------------------ #
# Webcam frame (the "snapshot" / live-frame endpoint)
# ------------------------------------------------------------------------ #
@router.post("/webcam", response_model=InferenceResult)
async def infer_webcam(
    file: UploadFile = File(...),
    session_id: str | None = Form(None),
    db: Session = Depends(get_db),
) -> InferenceResult:
    validate_upload_metadata(file)
    path = await save_upload(file, subdir="webcam")
    validate_saved_file_size(path)
    read_image_dimensions(path)  # confirms the frame decodes; raises InvalidImageError on corrupt frames

    result = inference_service.predict_webcam(path)
    if result.status == "model_not_loaded":
        raise ModelNotLoadedError(result.message or "Detection model is not loaded.")

    session = webcam_sessions.get(session_id) if session_id else None
    if session is not None and session.is_active:
        # Re-run through this session's tracker so IDs persist across frames,
        # then dedupe incident generation per-session (not per-frame).
        session.tracker.update(result.boxes)
        session.record_frame(detections=len(result.boxes), fps=result.fps, latency_ms=result.inference_ms)

        camera = db.get(Camera, session.camera_id) if session.camera_id else None
        if camera is not None and camera_has_policies(db, camera.id):
            # Bound to a site camera: enforce its zones and rules per person.
            created = enforce_frame(db, camera=camera, boxes=result.boxes, seen=session.seen_violations).created
        else:
            created = generate_incidents_from_detections(
                db,
                boxes=result.boxes,
                source_label=f"Live webcam: {session.camera_label}",
                seen_violations=session.seen_violations,
            ).created
        for incident in created:
            await broadcast_incident(
                {"id": incident.id, "missing_ppe": incident.missing_ppe, "severity": incident.severity.value}
            )

        await broadcast_tracking_update(session.tracker.camera_id, session.tracker.active_tracks_summary())

    await broadcast_detections(
        session.tracker.camera_id if session else "webcam",
        [b.model_dump() for b in result.boxes],
    )
    await broadcast_telemetry({"source": "inference/webcam", "fps": result.fps, "inference_ms": result.inference_ms})

    return result
