"""Tests for the authenticated /ws/live WebSocket channel."""
import pytest
from starlette.websockets import WebSocketDisconnect


def _token(client) -> str:
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return login.json()["access_token"]


def test_ws_rejects_without_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/live"):
            pass


def test_ws_rejects_invalid_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/live?token=not-a-real-token"):
            pass


def test_ws_accepts_valid_token_and_pongs(client):
    token = _token(client)
    with client.websocket_connect(f"/ws/live?token={token}") as ws:
        ack = ws.receive_json()
        assert ack["type"] == "connection_ack"
        assert ack["user"] == "admin"
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_ws_does_not_rebroadcast_client_payloads(client):
    """A client-sent event must NOT be echoed back or broadcast to peers."""
    token = _token(client)
    with client.websocket_connect(f"/ws/live?token={token}") as ws:
        ws.receive_json()  # connection_ack
        ws.send_json({"type": "forged_incident", "payload": {"severity": "critical"}})
        ws.send_json({"type": "ping"})
        # The only reply we should ever get is the pong — never the forged event.
        assert ws.receive_json() == {"type": "pong"}
