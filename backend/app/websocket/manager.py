"""
In-memory WebSocket connection manager for the /ws/live channel.
Broadcasts JSON messages (e.g. future detection events, system status
ticks) to every connected client. No AI wiring yet — this is transport only.
"""
from fastapi import WebSocket

from app.core.logging import logger


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected — {len(self.active_connections)} active")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected — {len(self.active_connections)} active")

    async def send_personal(self, message: dict, websocket: WebSocket) -> None:
        await websocket.send_json(message)

    async def broadcast(self, message: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:  # noqa: BLE001
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()
