import io


def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_infer_image_without_model_returns_503(client):
    """No best.pt is present in the test environment, so the API must fail
    clearly (503) rather than crash or silently return empty results."""
    headers = _auth_headers(client)
    files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xe0" + b"0" * 128), "image/jpeg")}
    response = client.post("/api/inference/image", files=files, headers=headers)
    assert response.status_code in (503, 422)
    body = response.json()
    assert "error" in body


def test_infer_requires_auth(client):
    files = {"file": ("test.jpg", io.BytesIO(b"x"), "image/jpeg")}
    response = client.post("/api/inference/image", files=files)
    assert response.status_code == 401


def test_infer_rejects_unsupported_extension(client):
    headers = _auth_headers(client)
    files = {"file": ("malware.exe", io.BytesIO(b"not an image"), "application/octet-stream")}
    response = client.post("/api/inference/image", files=files, headers=headers)
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"


def test_infer_rejects_empty_file(client):
    headers = _auth_headers(client)
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    response = client.post("/api/inference/image", files=files, headers=headers)
    assert response.status_code == 422
