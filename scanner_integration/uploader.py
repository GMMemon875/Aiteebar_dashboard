"""
Aiteebar Scanner Uploader Module (uploader.py)

Reads locally generated scan_report.json, adapts & validates redacted evidence,
and securely uploads to the centralized FastAPI backend over HTTPS with
idempotency (scan_id), safe retries, and an offline local queue.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import os
from pathlib import Path
import platform
import socket
import ssl
import time
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request
from urllib.parse import urlparse

from scanner_integration.report_adapter import (
    adapt_scan_report,
    load_device_id_default,
)


@dataclass
class UploaderConfig:
    api_base_url: str
    credentials_file: Path
    queue_dir: Path
    timeout_seconds: float = 15.0
    max_retries: int = 3
    retry_backoff_seconds: float = 1.5
    allow_insecure_http_localhost: bool = False


class UploaderError(RuntimeError):
    pass


def _validate_transport_url(url: str, allow_insecure_localhost: bool) -> None:
    parsed = urlparse(url)
    if parsed.scheme == "https":
        return
    if (
        allow_insecure_localhost
        and parsed.scheme == "http"
        and parsed.hostname in {"localhost", "127.0.0.1"}
    ):
        return
    raise UploaderError(
        f"Refusing non-HTTPS backend URL '{url}'. Use HTTPS in production."
    )


def _http_json(
    method: str,
    url: str,
    payload: dict[str, Any],
    *,
    headers: dict[str, str] | None = None,
    timeout: float = 15.0,
    allow_insecure_localhost: bool = False,
) -> tuple[int, dict[str, Any]]:
    _validate_transport_url(url, allow_insecure_localhost)
    data = json.dumps(payload).encode("utf-8")
    req_headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    req = urllib_request.Request(url=url, data=data, headers=req_headers, method=method)
    ctx = ssl.create_default_context() if url.startswith("https://") else None

    try:
        with urllib_request.urlopen(req, timeout=timeout, context=ctx) as resp:
            raw_body = resp.read().decode("utf-8")
            parsed = json.loads(raw_body) if raw_body else {}
            return resp.status, parsed
    except urllib_error.HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        try:
            err_json = json.loads(body_text)
        except Exception:
            err_json = {"detail": body_text}
        return exc.code, err_json


def load_credentials(credentials_file: Path) -> dict[str, str]:
    env_token = os.getenv("AITEEBAR_DEVICE_TOKEN", "").strip()
    env_dev_id = os.getenv("AITEEBAR_DEVICE_ID", "").strip()
    if env_token and env_dev_id:
        return {"device_id": env_dev_id, "device_token": env_token}

    if not credentials_file.exists():
        raise UploaderError(
            f"Device credentials not found at {credentials_file}. Run --enroll <TOKEN> first."
        )
    data = json.loads(credentials_file.read_text(encoding="utf-8"))
    if not data.get("device_token") or not data.get("device_id"):
        raise UploaderError("Credentials file is missing device_id or device_token.")
    return data


def save_credentials(credentials_file: Path, creds: dict[str, str]) -> None:
    credentials_file.parent.mkdir(parents=True, exist_ok=True)
    credentials_file.write_text(json.dumps(creds, indent=2), encoding="utf-8")
    try:
        os.chmod(credentials_file, 0o600)
    except OSError:
        pass


def enroll_device(
    config: UploaderConfig,
    enrollment_token: str,
    *,
    device_id: str | None = None,
    device_name: str | None = None,
    scanner_version: str = "1.4.2",
) -> dict[str, str]:
    dev_id = device_id or load_device_id_default()
    dev_name = device_name or socket.gethostname()
    os_desc = f"{platform.system()} {platform.release()}"
    url = f"{config.api_base_url.rstrip('/')}/devices/enroll"

    status_code, body = _http_json(
        "POST",
        url,
        {
            "enrollment_token": enrollment_token,
            "device_id": dev_id,
            "device_name": dev_name,
            "operating_system": os_desc,
            "scanner_version": scanner_version,
        },
        timeout=config.timeout_seconds,
        allow_insecure_localhost=config.allow_insecure_http_localhost,
    )
    if status_code not in {200, 201}:
        raise UploaderError(
            f"Enrollment failed (HTTP {status_code}): {body.get('detail', body)}"
        )

    creds = {
        "device_id": body["device_id"],
        "device_name": body["device_name"],
        "device_token": body["device_token"],
    }
    save_credentials(config.credentials_file, creds)
    return creds


def enqueue_pending_report(queue_dir: Path, payload: dict[str, Any]) -> Path:
    queue_dir.mkdir(parents=True, exist_ok=True)
    scan_id = payload.get("scan_id", f"SCN-{int(time.time())}")
    safe_name = "".join(c if c.isalnum() or c in {"-", "_"} else "_" for c in str(scan_id))
    target = queue_dir / f"{safe_name}.json"
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return target


def send_payload_with_retry(
    config: UploaderConfig,
    payload: dict[str, Any],
    creds: dict[str, str],
) -> dict[str, Any]:
    url = f"{config.api_base_url.rstrip('/')}/scans"
    headers = {
        "X-Device-Token": creds["device_token"],
        "Idempotency-Key": str(payload["scan_id"]),
    }

    last_error: Exception | None = None
    for attempt in range(1, config.max_retries + 1):
        try:
            status_code, body = _http_json(
                "POST",
                url,
                payload,
                headers=headers,
                timeout=config.timeout_seconds,
                allow_insecure_localhost=config.allow_insecure_http_localhost,
            )
            if status_code in {200, 201}:
                return body
            if status_code in {400, 401, 403, 409, 422}:
                raise UploaderError(
                    f"Upload rejected (HTTP {status_code}): {body.get('detail', body)}"
                )
            last_error = UploaderError(f"Transient server error HTTP {status_code}")
        except (urllib_error.URLError, TimeoutError, OSError) as exc:
            last_error = exc

        if attempt < config.max_retries:
            time.sleep(config.retry_backoff_seconds * attempt)

    raise UploaderError(f"Upload failed after {config.max_retries} attempts: {last_error}")


def upload_scan_report(
    report_path: Path,
    config: UploaderConfig,
) -> dict[str, Any]:
    if not report_path.exists():
        raise UploaderError(f"Scan report file not found: {report_path}")

    raw_report = json.loads(report_path.read_text(encoding="utf-8"))
    creds = load_credentials(config.credentials_file)
    payload = adapt_scan_report(
        raw_report,
        device_id=creds["device_id"],
        device_name=creds.get("device_name"),
    )

    try:
        result = send_payload_with_retry(config, payload, creds)
        flush_pending_queue(config, creds)
        return result
    except UploaderError as exc:
        # Queue locally if transient/network failure so local scanning remains functional
        if "HTTP 4" not in str(exc):
            queued_path = enqueue_pending_report(config.queue_dir, payload)
            return {
                "status": "queued_offline",
                "scan_id": payload["scan_id"],
                "queue_file": str(queued_path),
                "reason": str(exc),
            }
        raise


def flush_pending_queue(
    config: UploaderConfig,
    creds: dict[str, str] | None = None,
) -> list[str]:
    if not config.queue_dir.exists():
        return []
    creds = creds or load_credentials(config.credentials_file)
    uploaded: list[str] = []
    for queued_file in sorted(config.queue_dir.glob("*.json")):
        payload = json.loads(queued_file.read_text(encoding="utf-8"))
        try:
            send_payload_with_retry(config, payload, creds)
            queued_file.unlink(missing_ok=True)
            uploaded.append(str(payload.get("scan_id", queued_file.name)))
        except UploaderError:
            break
    return uploaded


def main() -> int:
    parser = argparse.ArgumentParser(description="Aiteebar Scanner Report Uploader")
    parser.add_argument(
        "--api-url",
        default=os.getenv("AITEEBAR_API_URL", "https://localhost:8000/api/v1"),
        help="Backend API v1 base URL (HTTPS required in production)",
    )
    parser.add_argument(
        "--report",
        default="scan_report.json",
        help="Path to locally generated scan_report.json",
    )
    parser.add_argument(
        "--enroll",
        metavar="TOKEN",
        help="Enroll this Windows device using an admin-issued one-time enrollment token",
    )
    parser.add_argument(
        "--credentials",
        default=".aiteebar_device_creds.json",
        help="Path to local device credentials file",
    )
    parser.add_argument(
        "--queue-dir",
        default="pending_queue",
        help="Directory for offline pending scan uploads",
    )
    parser.add_argument(
        "--allow-http-localhost",
        action="store_true",
        help="Allow plain HTTP strictly for localhost development testing",
    )
    args = parser.parse_args()

    cfg = UploaderConfig(
        api_base_url=args.api_url,
        credentials_file=Path(args.credentials),
        queue_dir=Path(args.queue_dir),
        allow_insecure_http_localhost=args.allow_http_localhost,
    )

    if args.enroll:
        creds = enroll_device(cfg, args.enroll)
        print(json.dumps({"enrolled": True, "device_id": creds["device_id"]}))
        return 0

    res = upload_scan_report(Path(args.report), cfg)
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
