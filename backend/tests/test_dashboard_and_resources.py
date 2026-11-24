from fastapi.testclient import TestClient

from tests.conftest import get_auth_headers


def test_dashboard_summary_security_status_and_registry(
    client: TestClient, admin_user
) -> None:
    headers = get_auth_headers(client, "admin@test.local", "StrongAdminPass123!")

    # Enroll device & upload scan with 1 HIGH risk
    enr_tok = client.post(
        "/api/v1/devices/enrollment-tokens", headers=headers, json={"note": ""}
    ).json()["enrollment_token"]
    dev_token = client.post(
        "/api/v1/devices/enroll",
        json={
            "enrollment_token": enr_tok,
            "device_id": "DEV-WIN-200",
            "device_name": "ENG-200",
            "operating_system": "Windows 11 Enterprise",
            "scanner_version": "1.4.2",
        },
    ).json()["device_token"]

    client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json={
            "scan_id": "SCN-200-1",
            "device_id": "DEV-WIN-200",
            "device_name": "ENG-200",
            "scanner_version": "1.4.2",
            "scan_start_utc": "2026-11-24T10:00:00Z",
            "scan_status": "warning",
            "ai_applications": [
                {
                    "name": "Ollama",
                    "classification": "known_ai",
                    "running_status": "running",
                    "installation_found": True,
                }
            ],
            "risk_findings": [
                {
                    "finding_code": "MCP-01",
                    "severity": "HIGH",
                    "title": "High Risk Item",
                    "description": "Test desc",
                    "remediation": "Fix it",
                }
            ],
        },
    )

    summary = client.get("/api/v1/dashboard/summary", headers=headers).json()
    assert summary["connected_devices"] == 1
    assert summary["ai_applications"] == 1
    assert summary["risk_findings"] == 1
    assert summary["high_risk_findings"] == 1

    sec = client.get("/api/v1/dashboard/security-status", headers=headers).json()
    assert sec["critical_count"] == 1
    assert sec["critical_pct"] == 100

    # Resolve finding and verify posture transitions to Healthy
    risks = client.get("/api/v1/risks", headers=headers).json()
    finding_id = risks[0]["id"]
    patch_res = client.patch(
        f"/api/v1/risks/{finding_id}",
        headers=headers,
        json={"review_status": "resolved", "reviewer_notes": "Verified fixed"},
    )
    assert patch_res.status_code == 200

    sec_after = client.get("/api/v1/dashboard/security-status", headers=headers).json()
    assert sec_after["healthy_count"] == 1
    assert sec_after["critical_count"] == 0

    # Registry CRUD
    reg_create = client.post(
        "/api/v1/registry/applications",
        headers=headers,
        json={
            "name": "Cursor",
            "publisher": "Anysphere",
            "process_names": ["Cursor.exe"],
            "installation_paths": ["%LOCALAPPDATA%\\Programs\\cursor\\Cursor.exe"],
            "is_enabled": True,
        },
    )
    assert reg_create.status_code == 201
    reg_id = reg_create.json()["id"]
    reg_list = client.get("/api/v1/registry/applications", headers=headers).json()
    assert len(reg_list) == 1
    assert client.delete(
        f"/api/v1/registry/applications/{reg_id}", headers=headers
    ).status_code == 204
