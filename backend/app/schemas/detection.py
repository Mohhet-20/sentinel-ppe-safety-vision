from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class BoundingBox(BaseModel):
    """Normalized bounding box — 0-1 relative to frame width/height."""

    x: float = Field(..., ge=0, le=1, description="Left edge")
    y: float = Field(..., ge=0, le=1, description="Top edge")
    w: float = Field(..., ge=0, le=1, description="Width")
    h: float = Field(..., ge=0, le=1, description="Height")


class DetectedObject(BaseModel):
    """A single detected object within one frame, before/without tracking."""

    class_id: int
    class_name: str
    confidence: float = Field(..., ge=0, le=1)
    bbox: BoundingBox
    track_id: str | None = None


class DetectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    camera_id: str | None = None
    zone_id: str | None = None
    track_id: str | None = None
    class_name: str
    confidence: float
    bbox: BoundingBox
    source_name: str | None = None
    inference_ms: float | None = None
    frame_timestamp: datetime


class InferenceResult(BaseModel):
    """
    Standard response shape for every InferenceService.predict_* method —
    this is the contract the API and WebSocket broadcasts are built around,
    regardless of whether a real model is loaded yet.
    """

    status: str = Field(
        ...,
        description="'ok' on a successful run, 'model_not_loaded' if best.pt is missing/unloaded",
    )
    boxes: list[DetectedObject] = Field(default_factory=list)
    latency_ms: float = Field(..., description="Total wall-clock time for the call, including I/O")
    inference_ms: float = Field(..., description="Time spent inside the model forward pass only")
    fps: float = Field(0.0, description="1000 / inference_ms, 0 if inference_ms is 0")
    model_name: str | None = None
    model_version: str | None = None
    message: str | None = None

    # Populated for image inference once a model is loaded.
    image_width: int | None = None
    image_height: int | None = None
    original_image_url: str | None = None
    annotated_image_url: str | None = None
    detection_ids: list[str] = Field(default_factory=list)


class ModelStatus(BaseModel):
    is_loaded: bool
    model_path: str
    exists_on_disk: bool
    backend: str | None = None
    device: str | None = None
    class_names: list[str] = Field(default_factory=list)
    last_loaded_at: str | None = None
    load_error: str | None = None
    total_predictions: int = 0
    avg_fps: float = 0.0
    avg_latency_ms: float = 0.0


class VideoTimelineEvent(BaseModel):
    time_sec: float
    class_name: str
    confidence: float
    track_id: str | None = None
    severity: str | None = None


class IncidentSummaryEntry(BaseModel):
    label: str
    count: int


class VideoInferenceResult(BaseModel):
    status: str = Field(..., description="'ok' | 'model_not_loaded'")
    message: str | None = None

    processed_video_url: str | None = None
    original_video_url: str | None = None

    total_frames: int = 0
    frames_processed: int = 0
    total_detections: int = 0
    unique_tracks: int = 0
    average_confidence: float = 0.0
    processing_fps: float = 0.0
    source_fps: float = 0.0
    duration_sec: float = 0.0
    processing_time_ms: float = 0.0

    timeline: list[VideoTimelineEvent] = Field(default_factory=list)
    incident_summary: list[IncidentSummaryEntry] = Field(default_factory=list)
    incident_ids: list[str] = Field(default_factory=list)


class WebcamSessionStatus(BaseModel):
    session_id: str | None = None
    camera_id: str | None = None
    is_active: bool
    started_at: str | None = None
    ended_at: str | None = None
    frame_count: int = 0
    detection_count: int = 0
    unique_tracks: int = 0
    avg_fps: float = 0.0
    avg_latency_ms: float = 0.0
    last_updated: str | None = None
