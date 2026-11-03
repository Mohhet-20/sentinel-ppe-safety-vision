def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_list_seeded_rules(client):
    headers = _auth_headers(client)
    response = client.get("/api/rules", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_create_rule(client):
    headers = _auth_headers(client)
    payload = {"name": "Boots required", "rule_type": "ppe_required", "required_ppe": ["boots"], "severity": "low"}
    response = client.post("/api/rules", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["name"] == "Boots required"


def test_rules_require_auth(client):
    response = client.get("/api/rules")
    assert response.status_code == 401
