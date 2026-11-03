from pydantic import BaseModel, ConfigDict, Field


class WorkerBase(BaseModel):
    employee_id: str = Field(..., examples=["EMP-2101"])
    name: str
    department: str
    role: str = "Site Operative"
    site: str | None = None
    compliance_score: float = Field(100.0, ge=0, le=100)
    risk_score: float = Field(0.0, ge=0, le=100)


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    role: str | None = None
    site: str | None = None
    compliance_score: float | None = Field(default=None, ge=0, le=100)
    risk_score: float | None = Field(default=None, ge=0, le=100)


class WorkerRead(WorkerBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
