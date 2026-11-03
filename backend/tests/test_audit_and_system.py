"""Tests for the audit trail and system-health dashboard endpoints."""


def _auth(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "ChangeMe123!"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_login_writes_audit_entry(client):
    # A successful login should now appear in the audit trail.
    headers = _auth(client)
    logs = client.get("/api/audit", headers=headers).json()
    assert any(e["action"] == "auth.login" and e["status"] == "success" for e in logs)


def test_failed_login_is_audited(client):
    client.post("/api/auth/login", json={"username": "admin", "password": "wrong-password"})
    headers = _auth(client)
    logs = client.get("/api/audit?status=failure", headers=headers).json()
    assert any(e["action"] == "auth.login" and e["status"] == "failure" for e in logs)


def test_audit_requires_auth(client):
    assert client.get("/api/audit").status_code == 401


def test_audit_category_filter(client):
    headers = _auth(client)
    # Trigger a configuration-category action.
    client.put(
        "/api/settings",
        headers=headers,
        json={
            "detection": {"confidence_threshold": 0.6, "iou_threshold": 0.45, "tracker": "bytetrack", "max_tracking_age": 30},
            "alerts": {"email_alerts": True, "push_alerts": True, "sms_alerts": False, "min_severity": "medium"},
            "reports": {"auto_generate_daily": True, "recipients": []},
        },
    )
    logs = client.get("/api/audit?category=configuration", headers=headers).json()
    assert all(e["category"] == "configuration" for e in logs)
    assert any(e["action"] == "settings.update" for e in logs)


def test_incident_update_is_audited(client):
    headers = _auth(client)
    incidents = client.get("/api/incidents", headers=headers).json()
    iid = incidents[0]["id"]
    client.patch(f"/api/incidents/{iid}", headers=headers, json={"status": "investigating"})
    logs = client.get("/api/audit?category=operations", headers=headers).json()
    assert any(e["action"] == "incident.update" and e["target_id"] == iid for e in logs)


def test_system_health_shape(client):
    headers = _auth(client)
    r = client.get("/api/system/health", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] in {"ok", "degraded", "critical"}
    assert body["uptime_seconds"] >= 0
    assert isinstance(body["resources"], list) and len(body["resources"]) >= 1
    assert any(d["name"] == "Database" for d in body["dependencies"])
    assert "cameras_total" in body


def test_system_health_requires_auth(client):
    assert client.get("/api/system/health").status_code == 401
