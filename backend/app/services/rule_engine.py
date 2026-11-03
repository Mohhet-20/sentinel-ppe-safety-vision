"""
Rule Engine — evaluates tracked detections against RuleConfiguration rows
(and each zone's own `required_ppe`) to decide when a safety violation has
occurred, and builds the resulting Incident payload. This module contains
no AI/model code — it's pure business logic over whatever detections were
already produced by InferenceService + TrackerService.
"""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.incident import IncidentSeverity
from app.models.rule_configuration import RuleConfiguration, RuleType
from app.models.zone import Zone, ZoneType
from app.schemas.detection import DetectedObject
from app.schemas.rule import IncidentPayload, RuleConfigurationCreate, RuleConfigurationUpdate

# PPE classes the Rule Engine understands out of the box. Keep in sync with
# the detector's class list (see backend README / AI stack recommendation).
PPE_CLASSES = {"hardhat", "vest", "boots", "mask", "goggles", "gloves"}


def _present_ppe_keywords(co_detections: list[DetectedObject]) -> set[str]:
    """
    Returns the subset of PPE_CLASSES satisfied by `co_detections`, matching
    by keyword substring rather than exact name (detector class names vary,
    e.g. "Safety Vest", "Hardhat") — mirrors the tokenization approach in
    ppe_incident_rules.classify_violation. Detections whose name contains a
    "no"/negation token are excluded: a "NO-Safety Vest" box must not be
    treated as satisfying the "vest" requirement.
    """
    present: set[str] = set()
    for d in co_detections:
        normalized = d.class_name.lower().replace("_", "-").replace(" ", "-")
        tokens = set(normalized.split("-"))
        if "no" in tokens:
            continue
        for keyword in PPE_CLASSES:
            if keyword in normalized:
                present.add(keyword)
    return present


# ---------------------------------------------------------------------- #
# CRUD
# ---------------------------------------------------------------------- #
def list_rules(
    db: Session,
    *,
    camera_id: str | None = None,
    active_only: bool = False,
    include_global: bool = False,
) -> list[RuleConfiguration]:
    """
    `camera_id` filters to that camera's rules. With `include_global`, rules
    that apply to every camera (camera_id NULL) are included too, which is
    what evaluation needs; the API's filter keeps the exact-match semantics.
    """
    stmt = select(RuleConfiguration)
    if camera_id and include_global:
        stmt = stmt.where(or_(RuleConfiguration.camera_id == camera_id, RuleConfiguration.camera_id.is_(None)))
    elif camera_id:
        stmt = stmt.where(RuleConfiguration.camera_id == camera_id)
    if active_only:
        stmt = stmt.where(RuleConfiguration.is_active.is_(True))
    return list(db.execute(stmt.order_by(RuleConfiguration.name)).scalars())


def get_rule(db: Session, rule_id: str) -> RuleConfiguration:
    rule = db.get(RuleConfiguration, rule_id)
    if rule is None:
        raise NotFoundError(f"Rule '{rule_id}' not found")
    return rule


def create_rule(db: Session, data: RuleConfigurationCreate) -> RuleConfiguration:
    rule = RuleConfiguration(**data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(db: Session, rule_id: str, data: RuleConfigurationUpdate) -> RuleConfiguration:
    rule = get_rule(db, rule_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


def delete_rule(db: Session, rule_id: str) -> None:
    rule = get_rule(db, rule_id)
    db.delete(rule)
    db.commit()


# ---------------------------------------------------------------------- #
# Evaluation
# ---------------------------------------------------------------------- #
def evaluate_ppe_compliance(
    *,
    camera_id: str,
    camera_name: str,
    person: DetectedObject,
    co_detections: list[DetectedObject],
    zone: Zone | None,
    required_ppe: list[str] | None = None,
) -> IncidentPayload | None:
    """
    Given one tracked `person` detection and the other detections found in
    the same frame (`co_detections` — hardhats, vests, etc.), checks whether
    every PPE class required by `zone` (or an explicit `required_ppe`
    override) is present nearby. Returns an IncidentPayload if something is
    missing, else None.
    """
    required = set(required_ppe) if required_ppe is not None else set((zone.required_ppe if zone else []) or [])
    if not required:
        return None

    present = _present_ppe_keywords(co_detections)
    missing = sorted(required - present)
    if not missing:
        return None

    severity = _severity_for_zone(zone) if zone else IncidentSeverity.MEDIUM
    return IncidentPayload(
        camera_id=camera_id,
        camera=camera_name,
        zone_id=zone.id if zone else None,
        track_id=person.track_id,
        missing_ppe=", ".join(missing),
        severity=severity,
        confidence=person.confidence,
        notes=f"Missing required PPE: {', '.join(missing)}" + (f" in zone '{zone.name}'" if zone else ""),
    )


def evaluate_zone_breach(
    *,
    camera_id: str,
    camera_name: str,
    person: DetectedObject,
    zone: Zone,
) -> IncidentPayload | None:
    """A person detected inside a RESTRICTED or DANGER zone is itself a violation."""
    if zone.zone_type not in (ZoneType.RESTRICTED, ZoneType.DANGER):
        return None

    return IncidentPayload(
        camera_id=camera_id,
        camera=camera_name,
        zone_id=zone.id,
        track_id=person.track_id,
        missing_ppe="",
        severity=_severity_for_zone(zone),
        confidence=person.confidence,
        notes=f"Person detected in {zone.zone_type.value} zone '{zone.name}'",
    )


def evaluate_frame(
    db: Session,
    *,
    camera_id: str,
    camera_name: str,
    detections: list[DetectedObject],
    zone_by_detection: dict[int, Zone | None],
) -> list[IncidentPayload]:
    """
    Runs both PPE-compliance and zone-breach checks for every person
    detection in a frame. `zone_by_detection` maps the index of a person
    detection in `detections` to its resolved Zone (via zone_service), so
    this function stays free of geometry concerns.
    """
    payloads: list[IncidentPayload] = []
    people = [(i, d) for i, d in enumerate(detections) if d.class_name.lower() == "person"]
    others = [d for d in detections if d.class_name.lower() != "person"]

    active_rules = list_rules(db, camera_id=camera_id, active_only=True, include_global=True)
    global_ppe_rules = [r for r in active_rules if r.rule_type == RuleType.PPE_REQUIRED and r.zone_id is None]

    for index, person in people:
        zone = zone_by_detection.get(index)

        ppe_incident = evaluate_ppe_compliance(
            camera_id=camera_id,
            camera_name=camera_name,
            person=person,
            co_detections=others,
            zone=zone,
        )
        if ppe_incident:
            payloads.append(ppe_incident)
        elif zone is None and global_ppe_rules:
            # No zone matched, but a camera-wide PPE rule still applies everywhere.
            for rule in global_ppe_rules:
                fallback = evaluate_ppe_compliance(
                    camera_id=camera_id,
                    camera_name=camera_name,
                    person=person,
                    co_detections=others,
                    zone=None,
                    required_ppe=rule.required_ppe,
                )
                if fallback:
                    payloads.append(fallback)

        if zone is not None:
            breach = evaluate_zone_breach(camera_id=camera_id, camera_name=camera_name, person=person, zone=zone)
            if breach:
                payloads.append(breach)

    return payloads


def _severity_for_zone(zone: Zone) -> IncidentSeverity:
    if zone.zone_type == ZoneType.DANGER:
        return IncidentSeverity.CRITICAL
    if zone.zone_type == ZoneType.RESTRICTED:
        return IncidentSeverity.HIGH
    return IncidentSeverity.MEDIUM if zone.priority >= 3 else IncidentSeverity.LOW
