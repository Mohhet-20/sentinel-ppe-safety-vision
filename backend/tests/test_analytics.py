def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_analytics_requires_auth(client):
    assert client.get("/api/analytics/summary").status_code == 401


def test_analytics_summary(client):
    headers = _auth_headers(client)
    response = client.get("/api/analytics/summary", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert "live_compliance" in body
    assert "todays_violations" in body
    # A real checkpoint is present at backend/models/best.pt in this environment,
    # so the correct/expected state is "loaded" (see test_models.py for the
    # dedicated "no weights present" failure-path tests).
    assert body["model_loaded"] is True


def test_worker_risk_ranking(client):
    headers = _auth_headers(client)
    response = client.get("/api/analytics/worker-risk-ranking", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_zone_ranking(client):
    headers = _auth_headers(client)
    response = client.get("/api/analytics/zone-ranking", headers=headers)
    assert response.status_code == 200


def test_camera_statistics(client):
    headers = _auth_headers(client)
    response = client.get("/api/analytics/camera-statistics", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_severity_breakdown(client):
    headers = _auth_headers(client)
    response = client.get("/api/analytics/severity-breakdown", headers=headers)
    assert response.status_code == 200
    assert "high" in response.json()
