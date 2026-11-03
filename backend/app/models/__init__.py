"""
SQLAlchemy ORM models. Imported here so Alembic's autogenerate and
Base.metadata.create_all() can discover every table.
"""
from app.models.user import User  # noqa: F401
from app.models.worker import Worker  # noqa: F401
from app.models.camera import Camera  # noqa: F401
from app.models.zone import Zone  # noqa: F401
from app.models.incident import Incident  # noqa: F401
from app.models.detection import Detection  # noqa: F401
from app.models.tracking_session import TrackingSession  # noqa: F401
from app.models.rule_configuration import RuleConfiguration  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401

__all__ = [
    "User",
    "Worker",
    "Camera",
    "Zone",
    "Incident",
    "Detection",
    "TrackingSession",
    "RuleConfiguration",
    "AuditLog",
]
