"""
AuditLog — an append-only record of security- and operations-relevant actions
(logins, settings/zone/rule changes, model reloads, incident updates, report
generation). This is the compliance trail an enterprise safety platform is
expected to keep; it is written by app.services.audit_service and never mutated
or deleted through the API.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, utcnow


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True, nullable=False)

    actor: Mapped[str] = mapped_column(String(128), index=True, nullable=False, default="system")
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # A stable, machine-filterable verb, e.g. "auth.login", "settings.update".
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    # Coarse category used for the UI filter chips: security | configuration | operations | model.
    category: Mapped[str] = mapped_column(String(32), index=True, nullable=False, default="operations")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="success")

    target_type: Mapped[str | None] = mapped_column(String(48), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditLog {self.action} by {self.actor}>"
