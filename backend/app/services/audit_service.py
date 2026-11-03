"""
Audit service — the single choke point for writing and reading the audit trail.

`record()` is deliberately best-effort and swallows its own errors: auditing must
never break the user-facing action it is describing (a failed login should still
return 401 even if the audit write fails). Reads are plain filtered queries.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.audit_log import AuditLog

# Maps each action verb to the coarse category used by the UI filter chips.
_CATEGORY_BY_PREFIX = {
    "auth": "security",
    "settings": "configuration",
    "zone": "configuration",
    "rule": "configuration",
    "model": "model",
    "incident": "operations",
    "report": "operations",
    "worker": "operations",
    "camera": "operations",
}


def _category_for(action: str) -> str:
    prefix = action.split(".", 1)[0]
    return _CATEGORY_BY_PREFIX.get(prefix, "operations")


def record(
    db: Session,
    *,
    action: str,
    actor: str = "system",
    actor_id: str | None = None,
    summary: str = "",
    target_type: str | None = None,
    target_id: str | None = None,
    status: str = "success",
    ip_address: str | None = None,
) -> AuditLog | None:
    """Append an entry to the audit trail. Never raises — auditing is non-blocking."""
    try:
        entry = AuditLog(
            action=action,
            category=_category_for(action),
            actor=actor,
            actor_id=actor_id,
            summary=summary,
            target_type=target_type,
            target_id=target_id,
            status=status,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as exc:  # noqa: BLE001 — auditing must not break the caller.
        logger.warning(f"Failed to write audit log for action '{action}': {exc}")
        db.rollback()
        return None


def list_logs(
    db: Session,
    *,
    category: str | None = None,
    action: str | None = None,
    actor: str | None = None,
    status: str | None = None,
    limit: int = 100,
) -> list[AuditLog]:
    stmt = select(AuditLog)
    if category and category != "all":
        stmt = stmt.where(AuditLog.category == category)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if actor:
        stmt = stmt.where(AuditLog.actor == actor)
    if status and status != "all":
        stmt = stmt.where(AuditLog.status == status)
    stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(max(1, min(limit, 500)))
    return list(db.execute(stmt).scalars().all())
