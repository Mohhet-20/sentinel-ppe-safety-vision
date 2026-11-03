"""
System health service — assembles a live snapshot of host resources and
platform dependencies for the System Health dashboard. Host metrics come from
psutil when available and degrade gracefully to "unknown" gauges otherwise, so
the endpoint never fails just because a metric source is missing.
"""
from __future__ import annotations

import shutil
import time
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.camera import Camera
from app.schemas.system import DependencyHealth, ResourceGauge, SystemHealth
from app.services.inference_service import inference_service
from app.websocket.manager import manager

try:  # psutil is optional; the dashboard still works without it.
    import psutil

    _HAS_PSUTIL = True
except Exception:  # noqa: BLE001
    _HAS_PSUTIL = False

_PROCESS_START = time.time()


def _gauge_status(value: float, warn: float, crit: float) -> str:
    if value >= crit:
        return "critical"
    if value >= warn:
        return "warn"
    return "ok"


def _resource_gauges() -> list[ResourceGauge]:
    if not _HAS_PSUTIL:
        return [
            ResourceGauge(label=name, value=0.0, status="unknown", detail="psutil not installed")
            for name in ("CPU", "Memory", "Disk")
        ]

    gauges: list[ResourceGauge] = []
    cpu = psutil.cpu_percent(interval=0.1)
    gauges.append(ResourceGauge(label="CPU", value=round(cpu, 1), status=_gauge_status(cpu, 75, 90)))

    vm = psutil.virtual_memory()
    gauges.append(
        ResourceGauge(
            label="Memory",
            value=round(vm.percent, 1),
            status=_gauge_status(vm.percent, 80, 92),
            detail=f"{round(vm.used / 1e9, 1)} / {round(vm.total / 1e9, 1)} GB",
        )
    )

    disk = psutil.disk_usage("/")
    gauges.append(
        ResourceGauge(
            label="Disk",
            value=round(disk.percent, 1),
            status=_gauge_status(disk.percent, 80, 92),
            detail=f"{round(disk.used / 1e9, 1)} / {round(disk.total / 1e9, 1)} GB",
        )
    )

    # GPU is best-effort: report presence only, never fabricate a utilisation number.
    device = (inference_service.model_status().get("device") or "").lower()
    if device and device not in {"cpu", ""}:
        gauges.append(ResourceGauge(label="GPU", value=0.0, unit="", status="ok", detail=f"Accelerator: {device}"))
    else:
        gauges.append(ResourceGauge(label="GPU", value=0.0, unit="", status="unknown", detail="No CUDA device"))

    return gauges


def _db_dependency(db: Session) -> DependencyHealth:
    start = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - start) * 1000, 2)
        return DependencyHealth(name="Database", status="ok", latency_ms=latency)
    except Exception as exc:  # noqa: BLE001
        return DependencyHealth(name="Database", status="down", detail=str(exc)[:120])


def get_system_health(db: Session) -> SystemHealth:
    resources = _resource_gauges()
    model_status = inference_service.model_status()

    cameras = db.query(Camera).all()
    cameras_online = sum(1 for c in cameras if str(getattr(c, "status", "")).lower() in {"online", "camerastatus.online"})

    storage_ok = True
    try:
        shutil.disk_usage("/")
    except Exception:  # noqa: BLE001
        storage_ok = False

    dependencies = [
        _db_dependency(db),
        DependencyHealth(
            name="Detection model",
            status="ok" if model_status.get("is_loaded") else "degraded",
            detail=model_status.get("load_error") or (model_status.get("device") or "not loaded"),
        ),
        DependencyHealth(
            name="WebSocket channel",
            status="ok",
            detail=f"{len(manager.active_connections)} active connection(s)",
        ),
        DependencyHealth(
            name="Storage",
            status="ok" if storage_ok else "down",
        ),
    ]

    # Overall roll-up: worst dependency + worst resource gauge wins.
    dep_states = {d.status for d in dependencies}
    res_states = {g.status for g in resources}
    if "down" in dep_states or "critical" in res_states:
        overall = "critical"
    elif "degraded" in dep_states or "warn" in res_states:
        overall = "degraded"
    else:
        overall = "ok"

    return SystemHealth(
        status=overall,
        app=settings.APP_NAME,
        version=settings.VERSION,
        environment=settings.APP_ENV,
        uptime_seconds=round(time.time() - _PROCESS_START, 1),
        timestamp=datetime.now(timezone.utc).isoformat(),
        resources=resources,
        dependencies=dependencies,
        cameras_total=len(cameras),
        cameras_online=cameras_online,
        websocket_connections=len(manager.active_connections),
        model_loaded=bool(model_status.get("is_loaded")),
        model_device=model_status.get("device"),
    )
