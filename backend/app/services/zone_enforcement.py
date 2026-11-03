"""
Zone Enforcement — runs the Rule Engine against a live, tracked frame.

This is the glue between the detection pipeline and the zone/rule
configuration: for every tracked person it resolves which zone they're
standing in (zone_service), attributes nearby PPE to *that* person
(spatial association, not "anywhere in the frame"), evaluates the camera's
zones and active rules (rule_engine), and turns each new violation into an
Incident — deduplicated per (track, zone, violation) for the session's
lifetime so a worker standing in a zone for a minute yields one incident.

Used by the live webcam pipeline when a session is bound to a site camera.
"""
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.models.camera import Camera
from app.models.zone import Zone
from app.schemas.detection import DetectedObject
from app.schemas.incident import IncidentCreate
from app.services import rule_engine, zone_service
from app.services.incident_service import create_incident

# A PPE box belongs to a person when its centre lies inside the person's box,
# grown by this fraction on each side (hard hats often poke above the head).
_ASSOCIATION_MARGIN = 0.15


def _is_person(d: DetectedObject) -> bool:
    return d.class_name.lower() == "person"


def ppe_for_person(person: DetectedObject, others: list[DetectedObject]) -> list[DetectedObject]:
    """Returns the non-person detections whose centre falls within `person`'s (slightly expanded) box."""
    b = person.bbox
    mx, my = b.w * _ASSOCIATION_MARGIN, b.h * _ASSOCIATION_MARGIN
    left, top, right, bottom = b.x - mx, b.y - my, b.x + b.w + mx, b.y + b.h + my

    attached = []
    for d in others:
        cx, cy = d.bbox.x + d.bbox.w / 2, d.bbox.y + d.bbox.h / 2
        if left <= cx <= right and top <= cy <= bottom:
            attached.append(d)
    return attached


@dataclass
class EnforcementResult:
    created: list = field(default_factory=list)
    evaluated_people: int = 0


def camera_has_policies(db: Session, camera_id: str) -> bool:
    """True when the camera has at least one active zone or camera-scoped/global rule to enforce."""
    return bool(zone_service.list_zones(db, camera_id=camera_id, active_only=True)) or bool(
        rule_engine.list_rules(db, camera_id=camera_id, active_only=True, include_global=True)
    )


def enforce_frame(
    db: Session,
    *,
    camera: Camera,
    boxes: list[DetectedObject],
    seen: set[tuple],
) -> EnforcementResult:
    """
    Evaluates one tracked frame against `camera`'s zones and rules. `seen` is
    owned by the caller (one per webcam session) and is mutated to dedupe
    incidents across frames.
    """
    result = EnforcementResult()
    people = [d for d in boxes if _is_person(d)]
    others = [d for d in boxes if not _is_person(d)]
    result.evaluated_people = len(people)

    for person in people:
        zone: Zone | None = zone_service.resolve_zone_for_bbox(db, camera.id, person.bbox.model_dump())
        payloads = rule_engine.evaluate_frame(
            db,
            camera_id=camera.id,
            camera_name=camera.name,
            # Evaluate each person in isolation with only the PPE attached to them.
            detections=[person, *ppe_for_person(person, others)],
            zone_by_detection={0: zone},
        )

        for payload in payloads:
            violation = payload.missing_ppe or "zone_breach"
            key = (person.track_id or f"untracked-{id(person)}", payload.zone_id, violation)
            if key in seen:
                continue
            seen.add(key)

            incident = create_incident(
                db,
                IncidentCreate(
                    camera=camera.name,
                    camera_id=camera.id,
                    zone_id=payload.zone_id,
                    track_id=payload.track_id,
                    missing_ppe=_label(payload.missing_ppe),
                    severity=payload.severity,
                    confidence=payload.confidence,
                    notes=payload.notes,
                ),
            )
            result.created.append(incident)

    return result


def _label(missing_ppe: str) -> str:
    """'hardhat, vest' -> 'Missing Hardhat, Vest'; '' (zone breach) -> 'Restricted Zone Entry'."""
    if not missing_ppe:
        return "Restricted Zone Entry"
    return "Missing " + ", ".join(p.strip().capitalize() for p in missing_ppe.split(","))
