from fastapi.testclient import TestClient

from tests.conftest import get_auth_headers


def _enroll_test_device(client: TestClient, headers: dict[str, str]) -> str:
    enr_tok = client.post(
        "/api/v1/devices/enrollment-tokens", headers=headers, json={"note": "test"}
    ).json()["enrollment_token"]
    return client.post(
        "/api/v1/devices/enroll",
        json={
            "enrollment_token": enr_tok,
            "device_id": "DEV-WIN-100",
            "device_name": "LAPTOP-100",
            "operating_system": "Windows 11 Enterprise",
            "scanner_version": "1.4.2",
        },
    ).json()["device_token"]


def test_scan_submission_idempotency_and_redaction(
    client: TestClient, admin_user
) -> None:
    headers = get_auth_headers(client, "admin@example.com", "StrongAdminPass123!")
    dev_token = _enroll_test_device(client, headers)

    payload = {
        "scan_id": "SCN-20261124-100-A",
        "device_id": "DEV-WIN-100",
        "device_name": "LAPTOP-100",
        "scanner_version": "1.4.2",
        "scan_start_utc": "2026-11-24T09:00:00Z",
        "scan_status": "warning",
        "ai_applications": [
            {
                "name": "Cursor",
                "publisher": "Anysphere",
                "classification": "known_ai",
                "running_status": "running",
                "installation_found": True,
                "registry_matched": True,
            }
        ],
        "mcp_servers": [
            {
                "server_name": "github",
                "package_name": "@modelcontextprotocol/server-github",
                "package_version": "latest",
                "version_pinned": False,
                "command": "npx",
                "redacted_arguments": ["-y", "--token=ghp_1234567890abcdef"],
                "configuration_source": "%USERPROFILE%\\.cursor\\mcp.json",
                "risk_level": "HIGH",
            }
        ],
        "risk_findings": [
            {
                "finding_code": "MCP-UNPINNED-01",
                "severity": "HIGH",
                "title": "Unpinned MCP Server",
                "description": "Server uses latest tag.",
                "related_asset": "MCP: github",
                "remediation": "Pin package version.",
            }
        ],
        "activity_events": [
            {
                "event_type": "MCP_CONFIG_MODIFIED",
                "resource_path": "%USERPROFILE%\\.cursor\\mcp.json",
                "responsible_process": "Cursor.exe",
                "event_status": "logged_redacted",
                "redacted_summary": "Updated mcp.json",
            }
        ],
        "raw_report": {
            "scan_id": "SCN-20261124-100-A",
            "api_key": "sk-secret1234567890abcdef",
        },
    }

    res1 = client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json=payload,
    )
    assert res1.status_code == 201
    assert res1.json()["status"] == "created"

    # Resubmitting identical scan_id must NOT duplicate records
    res2 = client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json=payload,
    )
    assert res2.status_code == 201
    assert res2.json()["status"] == "already_processed"

    scans = client.get("/api/v1/scans", headers=headers).json()
    assert len(scans) == 1

    # Verify defense-in-depth redaction in stored MCP args and preserved raw_report
    mcps = client.get("/api/v1/mcp-servers", headers=headers).json()
    assert len(mcps) == 1
    assert "ghp_" not in " ".join(mcps[0]["redacted_arguments"])

    raw = client.get("/api/v1/scans/SCN-20261124-100-A/report", headers=headers).json()
    assert raw["api_key"] == "[REDACTED]"


def test_invalid_scan_payload_and_device_mismatch(
    client: TestClient, admin_user
) -> None:
    headers = get_auth_headers(client, "admin@example.com", "StrongAdminPass123!")
    dev_token = _enroll_test_device(client, headers)

    # Device ID mismatch
    mismatch = client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json={
            "scan_id": "SCN-BAD-1",
            "device_id": "DEV-WIN-OTHER",
            "device_name": "OTHER",
            "scanner_version": "1.4.2",
            "scan_start_utc": "2026-11-24T09:00:00Z",
        },
    )
    assert mismatch.status_code == 403

    # Invalid JSON payload (missing required fields)
    invalid = client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json={"invalid": True},
    )
    assert invalid.status_code == 422
