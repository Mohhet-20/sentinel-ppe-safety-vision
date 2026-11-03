def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_webcam_lifecycle_requires_auth(client):
    assert client.post("/api/inference/webcam/start").status_code == 401
    assert client.post("/api/inference/webcam/stop", data={"session_id": "x"}).status_code == 401
    assert client.get("/api/inference/webcam/status").status_code == 401


def test_webcam_status_with_no_sessions(client):
    headers = _auth_headers(client)
    response = client.get("/api/inference/webcam/status", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_webcam_start_then_status_then_stop(client):
    headers = _auth_headers(client)

    start_resp = client.post("/api/inference/webcam/start", data={"camera_label": "Test Cam"}, headers=headers)
    assert start_resp.status_code == 200
    session = start_resp.json()
    assert session["is_active"] is True
    session_id = session["session_id"]

    status_resp = client.get(f"/api/inference/webcam/status?session_id={session_id}", headers=headers)
    assert status_resp.status_code == 200
    assert status_resp.json()["session_id"] == session_id

    stop_resp = client.post("/api/inference/webcam/stop", data={"session_id": session_id}, headers=headers)
    assert stop_resp.status_code == 200
    assert stop_resp.json()["is_active"] is False


def test_webcam_stop_unknown_session_returns_404(client):
    headers = _auth_headers(client)
    response = client.post("/api/inference/webcam/stop", data={"session_id": "does-not-exist"}, headers=headers)
    assert response.status_code == 404
