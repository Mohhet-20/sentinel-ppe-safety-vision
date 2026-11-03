import uuid

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin


class Worker(TimestampMixin, Base):
    __tablename__ = "workers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    department: Mapped[str] = mapped_column(String(64), nullable=False)
    role: Mapped[str] = mapped_column(String(64), default="Site Operative", nullable=False)
    site: Mapped[str | None] = mapped_column(String(128), nullable=True)
    compliance_score: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Worker {self.employee_id} {self.name}>"
