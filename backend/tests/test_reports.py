def _auth_headers(client):
    login = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_reports_require_auth(client):
    assert client.get("/api/reports/csv").status_code == 401
    assert client.get("/api/reports/excel").status_code == 401
    assert client.get("/api/reports/pdf").status_code == 401


def test_csv_report_downloads(client):
    headers = _auth_headers(client)
    response = client.get("/api/reports/csv", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert b"Sentinel Safety Report" in response.content


def test_excel_report_downloads(client):
    headers = _auth_headers(client)
    response = client.get("/api/reports/excel", headers=headers)
    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert len(response.content) > 100


def test_pdf_report_downloads(client):
    headers = _auth_headers(client)
    response = client.get("/api/reports/pdf", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"
