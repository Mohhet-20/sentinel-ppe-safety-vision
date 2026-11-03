def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _get_camera_id(client, headers):
    cams = client.get("/api/cameras", headers=headers).json()
    return cams[0]["id"]


def test_create_and_list_zone(client):
    headers = _auth_headers(client)
    camera_id = _get_camera_id(client, headers)

    payload = {
        "camera_id": camera_id,
        "name": "Test Zone",
        "zone_type": "restricted",
        "polygon": [{"x": 0.0, "y": 0.0}, {"x": 1.0, "y": 0.0}, {"x": 1.0, "y": 1.0}, {"x": 0.0, "y": 1.0}],
        "required_ppe": ["hardhat"],
        "priority": 3,
    }
    create_resp = client.post("/api/zones", json=payload, headers=headers)
    assert create_resp.status_code == 201
    zone_id = create_resp.json()["id"]

    list_resp = client.get(f"/api/zones?camera_id={camera_id}", headers=headers)
    assert list_resp.status_code == 200
    assert any(z["id"] == zone_id for z in list_resp.json())


def test_update_zone(client):
    headers = _auth_headers(client)
    camera_id = _get_camera_id(client, headers)
    payload = {
        "camera_id": camera_id,
        "name": "Update Me",
        "zone_type": "safe",
        "polygon": [],
        "required_ppe": [],
        "priority": 1,
    }
    zone_id = client.post("/api/zones", json=payload, headers=headers).json()["id"]

    patch_resp = client.patch(f"/api/zones/{zone_id}", json={"priority": 5}, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["priority"] == 5


def test_zones_require_auth(client):
    response = client.get("/api/zones")
    assert response.status_code == 401
