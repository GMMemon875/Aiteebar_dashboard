from fastapi.testclient import TestClient

from tests.conftest import get_auth_headers


def test_device_enrollment_and_single_use_token(client: TestClient, admin_user) -> None:
    headers = get_auth_headers(client, "admin@example.com", "StrongAdminPass123!")

    tok_res = client.post(
        "/api/v1/devices/enrollment-tokens",
        headers=headers,
        json={"note": "Laptop batch 1"},
    )
    assert tok_res.status_code == 201
    enrollment_token = tok_res.json()["enrollment_token"]

    enroll_res = client.post(
        "/api/v1/devices/enroll",
        json={
            "enrollment_token": enrollment_token,
            "device_id": "DEV-WIN-9001",
            "device_name": "CORP-WIN-9001",
            "operating_system": "Windows 11 Enterprise",
            "scanner_version": "1.4.2",
        },
    )
    assert enroll_res.status_code == 201
    body = enroll_res.json()
    assert body["device_id"] == "DEV-WIN-9001"
    assert body["device_token"].startswith("aite_dev_")

    # Reusing the same one-time enrollment token must fail
    reuse_res = client.post(
        "/api/v1/devices/enroll",
        json={
            "enrollment_token": enrollment_token,
            "device_id": "DEV-WIN-9002",
            "device_name": "CORP-WIN-9002",
            "operating_system": "Windows 11 Enterprise",
            "scanner_version": "1.4.2",
        },
    )
    assert reuse_res.status_code == 401

    # Permanent device token must NOT be exposed in device listing
    dev_list = client.get("/api/v1/devices", headers=headers)
    assert dev_list.status_code == 200
    assert len(dev_list.json()) == 1
    assert "device_token" not in dev_list.json()[0]


def test_revoked_device_token_is_rejected(client: TestClient, admin_user) -> None:
    headers = get_auth_headers(client, "admin@example.com", "StrongAdminPass123!")
    enr_tok = client.post(
        "/api/v1/devices/enrollment-tokens", headers=headers, json={"note": ""}
    ).json()["enrollment_token"]

    dev_token = client.post(
        "/api/v1/devices/enroll",
        json={
            "enrollment_token": enr_tok,
            "device_id": "DEV-WIN-9003",
            "device_name": "CORP-WIN-9003",
            "operating_system": "Windows 11 Pro",
            "scanner_version": "1.4.2",
        },
    ).json()["device_token"]

    rev_res = client.post("/api/v1/devices/DEV-WIN-9003/revoke", headers=headers)
    assert rev_res.status_code == 204

    scan_res = client.post(
        "/api/v1/scans",
        headers={"X-Device-Token": dev_token},
        json={
            "scan_id": "SCN-REVOKED-1",
            "device_id": "DEV-WIN-9003",
            "device_name": "CORP-WIN-9003",
            "scanner_version": "1.4.2",
            "scan_start_utc": "2026-11-24T10:00:00Z",
            "scan_status": "success",
        },
    )
    assert scan_res.status_code == 401
