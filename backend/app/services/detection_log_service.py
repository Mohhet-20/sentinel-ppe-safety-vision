"""
Persists InferenceService output as Detection rows — the historical record
of every object the model has ever flagged, independent of the Rule Engine
(which decides which of these become Incidents).
"""
from sqlalchemy.orm import Session

from app.models.detection import Detection
from app.schemas.detection import DetectedObject


def save_detections(
    db: Session,
    *,
    boxes: list[DetectedObject],
    source_name: str | None = None,
    inference_ms: float | None = None,
    camera_id: str | None = None,
    zone_id: str | None = None,
) -> list[Detection]:
    rows = [
        Detection(
            camera_id=camera_id,
            zone_id=zone_id,
            track_id=box.track_id,
            class_name=box.class_name,
            confidence=box.confidence,
            bbox=box.bbox.model_dump(),
            source_name=source_name,
            inference_ms=inference_ms,
        )
        for box in boxes
    ]
    if not rows:
        return []

    db.add_all(rows)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows
