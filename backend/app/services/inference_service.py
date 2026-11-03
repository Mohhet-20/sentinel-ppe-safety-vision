"""
Inference Service — the single place model loading and prediction happen.

Model management:
    - load_model()    loads (or reloads) weights from settings.model_path
    - reload_model()  explicit unload + load, e.g. after an admin action
    - model_status()  current state for the /api/models/status endpoint
    - Auto-reload: every predict_* call cheaply stats the weights file; if
      its mtime changed since the last successful load (i.e. someone
      replaced backend/models/best.pt), the service transparently reloads
      before running inference. No restart needed.

If the weights file is missing, load_model() logs a warning and returns
False — it NEVER raises or crashes the process. predict_* calls made while
unloaded return status="model_not_loaded" with a clear message; the API
layer turns that into a proper 503 (see routes/inference.py).

Ultralytics / OpenCV are imported lazily (inside methods), so the rest of
the API works even before those heavy deps are installed.
"""
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.core.logging import logger
from app.schemas.detection import DetectedObject, InferenceResult


class InferenceService:
    def __init__(self) -> None:
        self.model: Any | None = None
        self.model_name: str = settings.MODEL_FILENAME
        self.device: str = settings.MODEL_DEVICE
        self.is_loaded: bool = False
        self.backend: str | None = None  # "pytorch" | "openvino" once loaded
        self.class_names: list[str] = []
        self.last_loaded_at: datetime | None = None
        self.load_error: str | None = None
        self._loaded_mtime: float | None = None
        self.total_predictions: int = 0
        self._latency_samples: deque[float] = deque(maxlen=100)

    # ------------------------------------------------------------------ #
    # Model lifecycle
    # ------------------------------------------------------------------ #
    def load_model(self, weights_path: str | Path | None = None) -> bool:
        candidate = Path(weights_path) if weights_path else settings.model_path

        if not candidate.exists():
            self.is_loaded = False
            self.load_error = f"No weights found at '{candidate}'"
            logger.warning(
                f"InferenceService: {self.load_error}. Running in model_not_loaded mode — "
                "place a trained checkpoint there to enable real detection."
            )
            return False

        try:
            from ultralytics import YOLO  # noqa: PLC0415  (intentionally lazy)
        except ImportError:
            self.is_loaded = False
            self.load_error = "The 'ultralytics' package is not installed"
            logger.warning(f"InferenceService: {self.load_error}. Running in model_not_loaded mode.")
            return False

        try:
            model = YOLO(str(candidate))
            self.model = model
            self.class_names = list(model.names.values()) if hasattr(model, "names") else []
            self.backend = "openvino" if candidate.is_dir() else "pytorch"
            self.is_loaded = True
            self.load_error = None
            self.last_loaded_at = datetime.now(timezone.utc)
            self._loaded_mtime = candidate.stat().st_mtime if candidate.is_file() else None
            logger.info(
                f"InferenceService: loaded '{candidate.name}' ({self.backend}) on device={self.device} "
                f"— {len(self.class_names)} classes"
            )
            return True
        except Exception as exc:  # noqa: BLE001
            self.is_loaded = False
            self.load_error = f"Failed to load weights: {exc}"
            logger.exception(f"InferenceService: failed to load weights from '{candidate}'")
            return False

    def reload_model(self) -> bool:
        logger.info("InferenceService: reload requested")
        self.unload_model()
        return self.load_model()

    def unload_model(self) -> None:
        self.model = None
        self.is_loaded = False
        self.backend = None
        self.class_names = []
        self._loaded_mtime = None
        logger.info("InferenceService: model unloaded")

    def _maybe_auto_reload(self) -> None:
        """If best.pt was replaced on disk (different mtime), reload transparently."""
        candidate = settings.model_path
        if not candidate.exists():
            if self.is_loaded:
                logger.warning(f"InferenceService: '{candidate}' disappeared — unloading")
                self.unload_model()
            return

        current_mtime = candidate.stat().st_mtime if candidate.is_file() else None
        if not self.is_loaded:
            self.load_model()
        elif current_mtime is not None and current_mtime != self._loaded_mtime:
            logger.info(f"InferenceService: detected updated weights at '{candidate}' — auto-reloading")
            self.load_model()

    def ensure_ready(self) -> bool:
        """Public wrapper: triggers the auto-reload check and returns whether a model is ready to use."""
        self._maybe_auto_reload()
        return self.is_loaded

    def model_status(self) -> dict:
        avg_latency = round(sum(self._latency_samples) / len(self._latency_samples), 2) if self._latency_samples else 0.0
        avg_fps = round(1000 / avg_latency, 1) if avg_latency > 0 else 0.0
        return {
            "is_loaded": self.is_loaded,
            "model_path": str(settings.model_path),
            "exists_on_disk": settings.model_path.exists(),
            "backend": self.backend,
            "device": self.device,
            "class_names": self.class_names,
            "last_loaded_at": self.last_loaded_at.isoformat() if self.last_loaded_at else None,
            "load_error": self.load_error,
            "total_predictions": self.total_predictions,
            "avg_fps": avg_fps,
            "avg_latency_ms": avg_latency,
        }

    # ------------------------------------------------------------------ #
    # Prediction entry points
    # ------------------------------------------------------------------ #
    def predict_image(self, image_path: str | Path) -> InferenceResult:
        """Run detection on a single saved image file."""
        start = time.perf_counter()
        self._maybe_auto_reload()

        if not self.is_loaded:
            return self._not_loaded(start, note=f"Image '{Path(image_path).name}' received.")

        inference_start = time.perf_counter()
        try:
            results = self.model.predict(
                str(image_path),
                device=None if self.device == "AUTO" else self.device.lower(),
                conf=settings.MODEL_CONFIDENCE_THRESHOLD,
                iou=settings.MODEL_IOU_THRESHOLD,
                verbose=False,
            )
        except Exception:  # noqa: BLE001
            logger.exception(f"InferenceService: inference failed for '{image_path}'")
            raise

        inference_ms = (time.perf_counter() - inference_start) * 1000
        boxes = self._parse_ultralytics_result(results[0]) if results else []
        self.total_predictions += 1

        logger.info(
            f"InferenceService: predicted {len(boxes)} objects on '{Path(image_path).name}' "
            f"in {inference_ms:.1f}ms (total predictions: {self.total_predictions})"
        )

        return self._result(boxes, start, inference_ms)

    def predict_frame(self, frame: Any) -> tuple[list[DetectedObject], float]:
        """
        Runs inference directly on an in-memory BGR frame (numpy array) —
        the low-level primitive shared by predict_image/predict_video and
        by VideoProcessingService / WebcamSessionService, which layer
        tracking, annotation, and incident generation on top. Caller is
        expected to check `is_loaded` (or call `_maybe_auto_reload()`)
        beforehand; this returns `([], 0.0)` if no model is loaded rather
        than raising, so tight per-frame loops don't need a try/except.
        """
        if not self.is_loaded:
            return [], 0.0

        start = time.perf_counter()
        results = self.model.predict(
            frame,
            device=None if self.device == "AUTO" else self.device.lower(),
            conf=settings.MODEL_CONFIDENCE_THRESHOLD,
            iou=settings.MODEL_IOU_THRESHOLD,
            verbose=False,
        )
        boxes = self._parse_ultralytics_result(results[0]) if results else []
        inference_ms = (time.perf_counter() - start) * 1000
        self.total_predictions += 1
        self._latency_samples.append(inference_ms)
        return boxes, inference_ms

    def predict_video(self, video_path: str | Path, *, sample_every_n_frames: int = 1) -> list[InferenceResult]:
        """Run detection across a saved video file, sampling every Nth frame."""
        start = time.perf_counter()
        self._maybe_auto_reload()

        if not self.is_loaded:
            return [self._not_loaded(start, note=f"Video '{Path(video_path).name}' received.")]

        try:
            import cv2  # noqa: PLC0415
        except ImportError:
            logger.warning("InferenceService.predict_video: opencv-python is not installed.")
            return [self._not_loaded(start, note="OpenCV not installed.")]

        results: list[InferenceResult] = []
        capture = cv2.VideoCapture(str(video_path))
        frame_index = 0
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                if frame_index % sample_every_n_frames == 0:
                    frame_start = time.perf_counter()
                    predictions = self.model.predict(
                        frame,
                        device=None if self.device == "AUTO" else self.device.lower(),
                        conf=settings.MODEL_CONFIDENCE_THRESHOLD,
                        iou=settings.MODEL_IOU_THRESHOLD,
                        verbose=False,
                    )
                    boxes = self._parse_ultralytics_result(predictions[0]) if predictions else []
                    inference_ms = (time.perf_counter() - frame_start) * 1000
                    self.total_predictions += 1
                    results.append(self._result(boxes, frame_start, inference_ms))
                frame_index += 1
        finally:
            capture.release()

        return results or [self._not_loaded(start, note="Video contained no readable frames.")]

    def predict_webcam(self, frame_path: str | Path) -> InferenceResult:
        """Single snapshot frame from the Live Webcam page — same path as predict_image."""
        return self.predict_image(frame_path)

    async def predict_stream(self, frame_iterator):
        """Async generator variant for a continuous camera/WebSocket stream."""
        async for frame in frame_iterator:
            start = time.perf_counter()
            self._maybe_auto_reload()
            if not self.is_loaded:
                yield self._not_loaded(start, note="Stream frame received.")
                continue
            inference_start = time.perf_counter()
            predictions = self.model.predict(
                frame,
                device=None if self.device == "AUTO" else self.device.lower(),
                conf=settings.MODEL_CONFIDENCE_THRESHOLD,
                iou=settings.MODEL_IOU_THRESHOLD,
                verbose=False,
            )
            boxes = self._parse_ultralytics_result(predictions[0]) if predictions else []
            inference_ms = (time.perf_counter() - inference_start) * 1000
            self.total_predictions += 1
            yield self._result(boxes, start, inference_ms)

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _parse_ultralytics_result(self, result: Any) -> list[DetectedObject]:
        """Converts one Ultralytics `Results` object into normalized DetectedObject list."""
        boxes: list[DetectedObject] = []
        if result.boxes is None:
            return boxes

        img_h, img_w = result.orig_shape[:2]
        for box in result.boxes:
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            class_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            track_id = str(int(box.id[0].item())) if getattr(box, "id", None) is not None else None

            boxes.append(
                DetectedObject(
                    class_id=class_id,
                    class_name=self.class_names[class_id] if class_id < len(self.class_names) else str(class_id),
                    confidence=confidence,
                    bbox={
                        "x": max(0.0, min(1.0, x1 / img_w)),
                        "y": max(0.0, min(1.0, y1 / img_h)),
                        "w": max(0.0, min(1.0, (x2 - x1) / img_w)),
                        "h": max(0.0, min(1.0, (y2 - y1) / img_h)),
                    },
                    track_id=track_id,
                )
            )
        return boxes

    def _result(self, boxes: list[DetectedObject], start: float, inference_ms: float) -> InferenceResult:
        latency_ms = (time.perf_counter() - start) * 1000
        fps = round(1000 / inference_ms, 1) if inference_ms > 0 else 0.0
        self._latency_samples.append(inference_ms)
        return InferenceResult(
            status="ok",
            boxes=boxes,
            latency_ms=round(latency_ms, 2),
            inference_ms=round(inference_ms, 2),
            fps=fps,
            model_name=self.model_name,
            model_version=self.backend,
        )

    def _not_loaded(self, start: float, *, note: str) -> InferenceResult:
        latency_ms = (time.perf_counter() - start) * 1000
        message = self.load_error or "No model is currently loaded."
        return InferenceResult(
            status="model_not_loaded",
            boxes=[],
            latency_ms=round(latency_ms, 2),
            inference_ms=0.0,
            fps=0.0,
            model_name=self.model_name,
            model_version=None,
            message=f"{note} {message}",
        )


# Process-wide singleton — every route imports this same instance.
inference_service = InferenceService()
