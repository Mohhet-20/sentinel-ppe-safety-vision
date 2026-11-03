from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.worker import Worker
from app.schemas.worker import WorkerCreate, WorkerUpdate


def list_workers(db: Session, *, department: str | None = None, search: str | None = None) -> list[Worker]:
    stmt = select(Worker)
    if department and department != "all":
        stmt = stmt.where(Worker.department == department)
    if search:
        like = f"%{search}%"
        stmt = stmt.where((Worker.name.ilike(like)) | (Worker.employee_id.ilike(like)))
    return list(db.execute(stmt.order_by(Worker.name)).scalars())


def get_worker(db: Session, worker_id: str) -> Worker:
    worker = db.get(Worker, worker_id)
    if worker is None:
        raise NotFoundError(f"Worker '{worker_id}' not found")
    return worker


def create_worker(db: Session, data: WorkerCreate) -> Worker:
    worker = Worker(**data.model_dump())
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


def update_worker(db: Session, worker_id: str, data: WorkerUpdate) -> Worker:
    worker = get_worker(db, worker_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(worker, field, value)
    db.commit()
    db.refresh(worker)
    return worker


def delete_worker(db: Session, worker_id: str) -> None:
    worker = get_worker(db, worker_id)
    db.delete(worker)
    db.commit()
