"""
Typed broadcast helpers over the shared ConnectionManager (/ws/live).
Every message on the wire follows `{"type": ..., "payload": ..., "ts": ...}`
so the frontend can dispatch on `type` without guessing shapes.
"""
from datetime import datetime, timezone
from typing import Any

from app.websocket.manager import manager


def _envelope(msg_type: str, payload: Any) -> dict:
    return {"type": msg_type, "payload": payload, "ts": datetime.now(timezone.utc).isoformat()}


async def broadcast_detections(camera_id: str, boxes: list[dict]) -> None:
    await manager.broadcast(_envelope("detections", {"camera_id": camera_id, "boxes": boxes}))


async def broadcast_tracking_update(camera_id: str, tracks: list[dict]) -> None:
    await manager.broadcast(_envelope("tracking_update", {"camera_id": camera_id, "tracks": tracks}))


async def broadcast_incident(incident: dict) -> None:
    await manager.broadcast(_envelope("incident_update", incident))


async def broadcast_telemetry(snapshot: dict) -> None:
    await manager.broadcast(_envelope("telemetry", snapshot))
