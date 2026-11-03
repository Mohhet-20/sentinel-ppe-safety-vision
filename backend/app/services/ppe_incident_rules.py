"""
Maps raw detector class names (e.g. "no-hardhat", "no_helmet") to the
human-readable violation types the platform tracks, and turns a batch of
tracked detections into Incident rows — deduplicated per track so a person
missing a hardhat for 300 frames of video doesn't create 300 incidents.

This is intentionally decoupled from the Zone/Rule Engine (`rule_engine.py`,
which needs a configured Zone/RuleConfiguration) — this module is the
simpler, always-on safety net used by the video/webcam pipelines: any
"missing PPE" class the model emits becomes an incident, regardless of
zone configuration.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.incident import IncidentSeverity
from app.schemas.detection import DetectedObject
from app.schemas.incident import IncidentCreate
from app.services.incident_service import create_incident

# (keywords that must ALL appear in the lowercased, dash-normalized class name, label, severity)
_VIOLATION_RULES: list[tuple[tuple[str, ...], str, IncidentSeverity]] = [
    (("no", "hardhat"), "Missing Helmet", IncidentSeverity.HIGH),
    (("no", "helmet"), "Missing Helmet", IncidentSeverity.HIGH),
    (("no", "vest"), "Missing Vest", IncidentSeverity.MEDIUM),
    (("no", "mask"), "Missing Mask", IncidentSeverity.MEDIUM),
    (("no", "goggle"), "Missing Goggles", IncidentSeverity.MEDIUM),
    (("no", "glove"), "Missing Gloves", IncidentSeverity.LOW),
    (("no", "boot"), "Missing Boots", IncidentSeverity.LOW),
]


def classify_violation(class_name: str) -> tuple[str, IncidentSeverity] | None:
    """Returns (label, severity) if `class_name` denotes a missing-PPE violation, else None."""
    normalized = class_name.lower().replace("_", "-").replace(" ", "-")
    tokens = set(normalized.split("-"))
    for keywords, label, severity in _VIOLATION_RULES:
        if all(any(kw in token for token in tokens) for kw in keywords):
            return label, severity
    return None


@dataclass
class IncidentGenerationResult:
    created: list = field(default_factory=list)
    summary: dict[str, int] = field(default_factory=dict)


def _save_screenshot(frame: Any, *, screenshot_dir: Path, file_stem: str) -> str | None:
    try:
        import cv2  # noqa: PLC0415

        screenshot_dir.mkdir(parents=True, exist_ok=True)
        path = screenshot_dir / f"{file_stem}.jpg"
        cv2.imwrite(str(path), frame)
        return f"/uploads/incidents/{path.name}"
    except Exception:  # noqa: BLE001
        logger.exception("Failed to save incident screenshot")
        return None


def generate_incidents_from_detections(
    db: Session,
    *,
    boxes: list[DetectedObject],
    source_label: str,
    camera_id: str | None = None,
    zone_id: str | None = None,
    seen_violations: set[tuple[str, str]] | None = None,
    frame: Any | None = None,
) -> IncidentGenerationResult:
    """
    Scans `boxes` for violation classes and creates an Incident per new
    (track_id, label) pair not already present in `seen_violations` — pass
    the same set across frames of one video/session to dedupe across time.

    If `frame` (a BGR numpy array) is provided, a screenshot is saved and
    attached to each new incident.
    """
    seen = seen_violations if seen_violations is not None else set()
    result = IncidentGenerationResult()

    for box in boxes:
        classification = classify_violation(box.class_name)
        if classification is None:
            continue

        label, severity = classification
        dedupe_key = (box.track_id or f"untracked-{box.class_id}", label)
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        screenshot_path = None
        if frame is not None:
            import uuid  # noqa: PLC0415

            screenshot_path = _save_screenshot(
                frame,
                screenshot_dir=settings.upload_path / "incidents",
                file_stem=f"incident-{uuid.uuid4().hex[:12]}",
            )

        incident = create_incident(
            db,
            IncidentCreate(
                camera=source_label,
                camera_id=camera_id,
                zone_id=zone_id,
                track_id=box.track_id,
                missing_ppe=label,
                severity=severity,
                confidence=box.confidence,
                notes=f"Auto-detected by AI pipeline (track {box.track_id or 'n/a'})",
                screenshot_path=screenshot_path,
            ),
        )
        result.created.append(incident)
        result.summary[label] = result.summary.get(label, 0) + 1

    return result
