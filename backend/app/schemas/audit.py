from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    actor: str
    actor_id: str | None = None
    action: str
    category: str
    status: str
    target_type: str | None = None
    target_id: str | None = None
    summary: str
    ip_address: str | None = None
