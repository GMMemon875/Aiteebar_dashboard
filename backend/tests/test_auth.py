from fastapi.testclient import TestClient

from tests.conftest import get_auth_headers


def test_login_success_and_me(client: TestClient, admin_user) -> None:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "StrongAdminPass123!"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == "admin@example.com"
    assert "access_token" in data
    assert "refresh_token" in data

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {data['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_login_invalid_password_rejected(client: TestClient, admin_user) -> None:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "WrongPassword!"},
    )
    assert res.status_code == 401


def test_refresh_token_flow(client: TestClient, admin_user) -> None:
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "StrongAdminPass123!"},
    )
    refresh = res.json()["refresh_token"]
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert ref_res.status_code == 200
    assert ref_res.json()["user"]["email"] == "admin@example.com"


def test_viewer_cannot_access_admin_endpoints(client: TestClient, viewer_user) -> None:
    headers = get_auth_headers(client, "viewer@example.com", "StrongViewerPass123!")
    res = client.get("/api/v1/users", headers=headers)
    assert res.status_code == 403

    res_reg = client.post(
        "/api/v1/registry/applications",
        headers=headers,
        json={
            "name": "TestApp",
            "publisher": "Pub",
            "process_names": ["test.exe"],
            "installation_paths": [],
            "is_enabled": True,
        },
    )
    assert res_reg.status_code == 403
