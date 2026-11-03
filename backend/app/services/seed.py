"""
Seeds a demo admin user (and a small set of sample records) on first startup
so the API is immediately usable against the frontend's mock-data shapes.
Safe to call on every startup — it only inserts data that doesn't exist yet.
"""
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import logger
from app.models.camera import Camera, CameraStatus
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.rule_configuration import RuleConfiguration, RuleType
from app.models.user import UserRole
from app.models.worker import Worker
from app.models.zone import Zone, ZoneType
from app.services.user_service import get_user_by_username, create_user


def seed_demo_admin(db: Session) -> None:
    if get_user_by_username(db, settings.DEMO_ADMIN_USERNAME):
        return
    # Seed a single administrator account on first run. Force a password change
    # on first login so the deployer updates the default credential.
    create_user(
        db,
        username=settings.DEMO_ADMIN_USERNAME,
        email=settings.DEMO_ADMIN_EMAIL,
        password=settings.DEMO_ADMIN_PASSWORD,
        role=UserRole.ADMIN,
        full_name="Sentinel Administrator",
    )
    # Ensure the seeded admin must change password on first login
    admin = get_user_by_username(db, settings.DEMO_ADMIN_USERNAME)
    if admin:
        admin.force_password_change = True
        db.add(admin)
        db.commit()
    logger.info(f"Seeded demo admin user '{settings.DEMO_ADMIN_USERNAME}'")


def seed_sample_data(db: Session) -> None:
    if db.query(Camera).count() == 0:
        cameras = [
            Camera(name="CAM-01 · Loading Dock", source="rtsp://demo/cam01", site="Riverside Plant", zone="Zone B", status=CameraStatus.ONLINE),
            Camera(name="CAM-04 · Assembly Line 2", source="rtsp://demo/cam04", site="Riverside Plant", zone="Zone A", status=CameraStatus.ONLINE),
            Camera(name="CAM-07 · Warehouse East", source="rtsp://demo/cam07", site="Northgate Hub", zone="Zone C", status=CameraStatus.DEGRADED),
            Camera(name="CAM-12 · Perimeter Gate", source="rtsp://demo/cam12", site="Delta Line 4", zone="Zone D", status=CameraStatus.OFFLINE),
        ]
        db.add_all(cameras)
        db.commit()
        logger.info(f"Seeded {len(cameras)} demo cameras")

    if db.query(Worker).count() == 0:
        workers = [
            Worker(employee_id="EMP-2101", name="Daniel Marsh", department="Assembly", compliance_score=78.0, risk_score=82.0),
            Worker(employee_id="EMP-2102", name="Renata Alvarez", department="Warehouse", compliance_score=84.0, risk_score=74.0),
            Worker(employee_id="EMP-2103", name="Kevin Chen", department="Logistics", compliance_score=88.0, risk_score=66.0),
            Worker(employee_id="EMP-2104", name="Tunde Obi", department="Maintenance", compliance_score=91.0, risk_score=58.0),
        ]
        db.add_all(workers)
        db.commit()
        logger.info(f"Seeded {len(workers)} demo workers")

    if db.query(Incident).count() == 0:
        camera = db.query(Camera).first()
        worker = db.query(Worker).first()
        incidents = [
            Incident(
                camera=camera.name if camera else "CAM-01 · Loading Dock",
                camera_id=camera.id if camera else None,
                worker_id=worker.id if worker else None,
                missing_ppe="Hard Hat",
                severity=IncidentSeverity.HIGH,
                status=IncidentStatus.OPEN,
                confidence=0.91,
                assigned_to="Unassigned",
            ),
        ]
        db.add_all(incidents)
        db.commit()
        logger.info(f"Seeded {len(incidents)} demo incidents")


def seed_zones_and_rules(db: Session) -> None:
    if db.query(Zone).count() == 0:
        camera = db.query(Camera).first()
        if camera:
            zones = [
                Zone(
                    camera_id=camera.id,
                    name="Assembly Floor",
                    zone_type=ZoneType.SAFE,
                    polygon=[{"x": 0.05, "y": 0.1}, {"x": 0.6, "y": 0.1}, {"x": 0.6, "y": 0.9}, {"x": 0.05, "y": 0.9}],
                    required_ppe=["hardhat", "vest"],
                    priority=2,
                ),
                Zone(
                    camera_id=camera.id,
                    name="Forklift Lane",
                    zone_type=ZoneType.RESTRICTED,
                    polygon=[{"x": 0.6, "y": 0.3}, {"x": 0.95, "y": 0.3}, {"x": 0.95, "y": 0.95}, {"x": 0.6, "y": 0.95}],
                    required_ppe=["hardhat", "vest"],
                    priority=4,
                ),
            ]
            db.add_all(zones)
            db.commit()
            logger.info(f"Seeded {len(zones)} demo zones")

    if db.query(RuleConfiguration).count() == 0:
        rules = [
            RuleConfiguration(
                name="Hard hat required — site-wide",
                rule_type=RuleType.PPE_REQUIRED,
                required_ppe=["hardhat"],
                severity=IncidentSeverity.HIGH,
            ),
            RuleConfiguration(
                name="Hi-vis vest required — site-wide",
                rule_type=RuleType.PPE_REQUIRED,
                required_ppe=["vest"],
                severity=IncidentSeverity.MEDIUM,
            ),
            RuleConfiguration(
                name="No entry — restricted zones",
                rule_type=RuleType.ZONE_RESTRICTED,
                severity=IncidentSeverity.HIGH,
            ),
        ]
        db.add_all(rules)
        db.commit()
        logger.info(f"Seeded {len(rules)} demo rule configurations")


def run_seed(db: Session) -> None:
    seed_demo_admin(db)
    seed_sample_data(db)
    seed_zones_and_rules(db)
