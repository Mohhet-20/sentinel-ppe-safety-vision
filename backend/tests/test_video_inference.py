import io


def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_infer_video_requires_auth(client):
    files = {"file": ("clip.mp4", io.BytesIO(b"not a real video"), "video/mp4")}
    response = client.post("/api/inference/video", files=files)
    assert response.status_code == 401


def test_infer_video_rejects_unsupported_extension(client):
    headers = _auth_headers(client)
    files = {"file": ("clip.txt", io.BytesIO(b"nope"), "text/plain")}
    response = client.post("/api/inference/video", files=files, headers=headers)
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"


def test_infer_video_rejects_empty_file(client):
    headers = _auth_headers(client)
    files = {"file": ("clip.mp4", io.BytesIO(b""), "video/mp4")}
    response = client.post("/api/inference/video", files=files, headers=headers)
    assert response.status_code == 422


def test_infer_video_accepts_all_documented_formats_at_the_validation_layer(client):
    """Every documented extension should pass the extension check (and then
    fail later — invalid content / no model — never with a 415)."""
    headers = _auth_headers(client)
    for ext, mime in [(".mp4", "video/mp4"), (".avi", "video/x-msvideo"), (".mov", "video/quicktime"), (".mkv", "video/x-matroska")]:
        files = {"file": (f"clip{ext}", io.BytesIO(b"not a real video but has bytes"), mime)}
        response = client.post("/api/inference/video", files=files, headers=headers)
        assert response.status_code != 415, f"{ext} should not be rejected as unsupported"
