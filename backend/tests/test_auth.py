def test_login_success(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_with_email_identifier(client):
    # The frontend Login page collects an email; the backend accepts email OR username.
    response = client.post("/api/auth/login", json={"username": "admin@sentinel-ai.com", "password": "ChangeMe123!"})
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_credentials(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert response.status_code == 401


def test_profile_requires_auth(client):
    response = client.get("/api/auth/profile")
    assert response.status_code == 401


def test_profile_with_token(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    token = login.json()["access_token"]
    response = client.get("/api/auth/profile", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "admin"
