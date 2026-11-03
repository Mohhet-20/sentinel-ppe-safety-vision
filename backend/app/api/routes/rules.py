"""
Rule Engine CRUD endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.schemas.rule import RuleConfigurationCreate, RuleConfigurationRead, RuleConfigurationUpdate
from app.services import rule_engine

router = APIRouter(prefix="/rules", tags=["Rules"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[RuleConfigurationRead])
def list_rules(camera_id: str | None = None, active_only: bool = False, db: Session = Depends(get_db)):
    return rule_engine.list_rules(db, camera_id=camera_id, active_only=active_only)


@router.get("/{rule_id}", response_model=RuleConfigurationRead)
def get_rule(rule_id: str, db: Session = Depends(get_db)):
    return rule_engine.get_rule(db, rule_id)


@router.post("", response_model=RuleConfigurationRead, status_code=201)
def create_rule(payload: RuleConfigurationCreate, db: Session = Depends(get_db)):
    return rule_engine.create_rule(db, payload)


@router.patch("/{rule_id}", response_model=RuleConfigurationRead)
def update_rule(rule_id: str, payload: RuleConfigurationUpdate, db: Session = Depends(get_db)):
    return rule_engine.update_rule(db, rule_id, payload)


@router.delete("/{rule_id}", status_code=204)
def delete_rule(rule_id: str, db: Session = Depends(get_db)):
    rule_engine.delete_rule(db, rule_id)
