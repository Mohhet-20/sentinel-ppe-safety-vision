def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_list_workers_requires_auth(client):
    response = client.get("/api/workers")
    assert response.status_code == 401


def test_list_workers(client):
    response = client.get("/api/workers", headers=_auth_headers(client))
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_worker(client):
    payload = {"employee_id": "EMP-9999", "name": "Test Worker", "department": "QA"}
    response = client.post("/api/workers", json=payload, headers=_auth_headers(client))
    assert response.status_code == 201
    assert response.json()["employee_id"] == "EMP-9999"
