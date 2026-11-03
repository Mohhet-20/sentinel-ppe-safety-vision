"""
Worker directory CRUD endpoints. All routes require an authenticated user.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.worker import WorkerCreate, WorkerRead, WorkerUpdate
from app.services import worker_service

router = APIRouter(prefix="/workers", tags=["Workers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[WorkerRead])
def list_workers(department: str | None = None, search: str | None = None, db: Session = Depends(get_db)):
    return worker_service.list_workers(db, department=department, search=search)


@router.get("/{worker_id}", response_model=WorkerRead)
def get_worker(worker_id: str, db: Session = Depends(get_db)):
    return worker_service.get_worker(db, worker_id)


@router.post("", response_model=WorkerRead, status_code=201)
def create_worker(payload: WorkerCreate, db: Session = Depends(get_db)):
    return worker_service.create_worker(db, payload)


@router.patch("/{worker_id}", response_model=WorkerRead)
def update_worker(worker_id: str, payload: WorkerUpdate, db: Session = Depends(get_db)):
    return worker_service.update_worker(db, worker_id, payload)


@router.delete("/{worker_id}", status_code=204)
def delete_worker(worker_id: str, db: Session = Depends(get_db)):
    worker_service.delete_worker(db, worker_id)
