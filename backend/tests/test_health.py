def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "app" in response.json()
