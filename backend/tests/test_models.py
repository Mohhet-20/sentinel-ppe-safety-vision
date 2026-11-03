from app.core.config import settings
from app.services.inference_service import inference_service


def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_model_status_requires_auth(client):
    response = client.get("/api/models/status")
    assert response.status_code == 401


def test_model_status_reports_not_loaded(client, monkeypatch):
    # A real checkpoint exists at backend/models/best.pt in this environment,
    # so point MODEL_FILENAME at a nonexistent file to exercise the
    # "no weights present" failure path deterministically, independent of
    # whatever happens to be on disk.
    monkeypatch.setattr(settings, "MODEL_FILENAME", "nonexistent_test_model.pt")
    inference_service.load_model()
    headers = _auth_headers(client)
    response = client.get("/api/models/status", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["is_loaded"] is False
    assert body["exists_on_disk"] is False
    assert body["load_error"]


def test_model_reload_stays_not_loaded_without_weights(client, monkeypatch):
    monkeypatch.setattr(settings, "MODEL_FILENAME", "nonexistent_test_model.pt")
    headers = _auth_headers(client)
    response = client.post("/api/models/reload", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_loaded"] is False
