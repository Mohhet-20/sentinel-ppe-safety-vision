"""
WebSocket routes. `/ws/live` is the channel the frontend subscribes to for
real-time detection events, incident alerts, and telemetry ticks emitted by
the inference pipeline (see app/websocket/broadcaster.py).

Security: the channel is authenticated. Browsers can't set Authorization
headers on a WebSocket handshake, so the access token is passed as a
`?token=` query parameter and validated before the socket is accepted.
Unauthenticated handshakes are rejected with policy-violation (4401) and the
connection is never added to the broadcast pool.

The server does NOT rebroadcast arbitrary client-sent payloads — a connected
browser is a *consumer* of server events, not a producer. Only a lightweight
`ping`/`pong` keepalive is handled inbound; everything else is ignored. This
prevents any client from injecting forged events into every other client's
feed.
"""
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.auth.jwt import TokenError, decode_token
from app.core.logging import logger
from app.database.session import get_db
from app.models.user import User
from app.websocket.manager import manager

router = APIRouter()


def _authenticate(token: str | None, db: Session) -> User | None:
    """Validate an access token off the WS query string. Returns the user or None."""
    if not token:
        return None
    try:
        payload = decode_token(token)
    except TokenError:
        return None
    if payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    return user


@router.websocket("/ws/live")
async def websocket_live(
    websocket: WebSocket,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> None:
    user = _authenticate(token, db)
    if user is None:
        # Reject before accepting so an unauthenticated peer never joins the pool.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        logger.warning("WebSocket handshake rejected: missing/invalid token")
        return

    await manager.connect(websocket)
    await manager.send_personal(
        {"type": "connection_ack", "message": "Connected to Sentinel live channel.", "user": user.username},
        websocket,
    )
    try:
        while True:
            data = await websocket.receive_json()
            # Inbound is keepalive only — clients consume events, they don't emit them.
            if data.get("type") == "ping":
                await manager.send_personal({"type": "pong"}, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:  # noqa: BLE001 — malformed frame / non-JSON: drop the connection cleanly.
        logger.debug("WebSocket closed after a client protocol error")
        manager.disconnect(websocket)
