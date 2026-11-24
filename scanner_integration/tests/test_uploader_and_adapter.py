from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest

from scanner_integration.report_adapter import adapt_scan_report
from scanner_integration.uploader import (
    UploaderConfig,
    UploaderError,
    enroll_device,
    flush_pending_queue,
    upload_scan_report,
)


class _MockBackendState:
    def __init__(self) -> None:
        self.received_scans: list[dict] = []
        self.seen_scan_ids: set[str] = set()
        self.fail_next_scan_requests = 0


def _start_mock_server(state: _MockBackendState):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, format, *args):
            return

        def do_POST(self):
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length).decode("utf-8"))

            if self.path == "/api/v1/devices/enroll":
                if body.get("enrollment_token") != "AITE-ENR-VALID":
                    self.send_response(401)
                    self.end_headers()
                    self.wfile.write(json.dumps({"detail": "Invalid token"}).encode())
                    return
                self.send_response(201)
                self.end_headers()
                self.wfile.write(
                    json.dumps(
                        {
                            "device_id": body["device_id"],
                            "device_name": body["device_name"],
                            "device_token": "aite_dev_mock_secret_token",
                        }
                    ).encode()
                )
                return

            if self.path == "/api/v1/scans":
                if self.headers.get("X-Device-Token") != "aite_dev_mock_secret_token":
                    self.send_response(401)
                    self.end_headers()
                    self.wfile.write(json.dumps({"detail": "Unauthorized"}).encode())
                    return

                if state.fail_next_scan_requests > 0:
                    state.fail_next_scan_requests -= 1
                    self.send_response(503)
                    self.end_headers()
                    self.wfile.write(json.dumps({"detail": "Unavailable"}).encode())
                    return

                scan_id = body["scan_id"]
                status = (
                    "already_processed" if scan_id in state.seen_scan_ids else "created"
                )
                if status == "created":
                    state.seen_scan_ids.add(scan_id)
                    state.received_scans.append(body)

                self.send_response(201)
                self.end_headers()
                self.wfile.write(
                    json.dumps({"status": status, "scan_id": scan_id}).encode()
                )
                return

            self.send_response(404)
            self.end_headers()

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


class TestScannerIntegration(unittest.TestCase):
    def test_adapter_redacts_secrets_and_handles_missing_fields(self) -> None:
        legacy_report = {
            "hostname": "WIN-LAPTOP-77",
            "applications": [
                {"app_name": "Cursor", "is_running": True, "installed": True, "registry_matched": True},
                {"app_name": "MysteryAI.exe"},
            ],
            "mcp_configurations": [
                {
                    "name": "github",
                    "package": "@modelcontextprotocol/server-github",
                    "args": ["--token=ghp_supersecret123456"],
                    "source": "%USERPROFILE%\\.cursor\\mcp.json",
                    "severity": "HIGH",
                }
            ],
            "clipboard_content": "SHOULD_BE_REDACTED",
        }
        adapted = adapt_scan_report(legacy_report, device_id="DEV-WIN-77")
        self.assertEqual(adapted["device_name"], "WIN-LAPTOP-77")
        self.assertEqual(len(adapted["ai_applications"]), 2)
        self.assertEqual(adapted["ai_applications"][0]["classification"], "known_ai")
        self.assertEqual(adapted["ai_applications"][1]["classification"], "unknown_ai_candidate")
        self.assertNotIn("ghp_supersecret", " ".join(adapted["mcp_servers"][0]["redacted_arguments"]))
        self.assertEqual(adapted["raw_report"]["clipboard_content"], "[REDACTED]")

    def test_https_enforced_for_remote_urls(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cfg = UploaderConfig(
                api_base_url="http://remote-server.example.com/api/v1",
                credentials_file=Path(tmp) / "creds.json",
                queue_dir=Path(tmp) / "queue",
                allow_insecure_http_localhost=True,
            )
            with self.assertRaises(UploaderError):
                enroll_device(cfg, "AITE-ENR-VALID")

    def test_enroll_upload_retry_and_offline_queue_flush(self) -> None:
        state = _MockBackendState()
        server = _start_mock_server(state)
        port = server.server_address[1]
        try:
            with tempfile.TemporaryDirectory() as tmp:
                tmp_path = Path(tmp)
                cfg = UploaderConfig(
                    api_base_url=f"http://127.0.0.1:{port}/api/v1",
                    credentials_file=tmp_path / "creds.json",
                    queue_dir=tmp_path / "queue",
                    max_retries=2,
                    retry_backoff_seconds=0.05,
                    allow_insecure_http_localhost=True,
                )
                creds = enroll_device(cfg, "AITE-ENR-VALID", device_id="DEV-WIN-TEST1")
                self.assertEqual(creds["device_id"], "DEV-WIN-TEST1")

                report_file = tmp_path / "scan_report.json"
                report_file.write_text(
                    json.dumps(
                        {
                            "scan_id": "SCN-E2E-001",
                            "scanner_version": "1.4.2",
                            "scan_start_utc": "2026-11-24T10:00:00Z",
                            "ai_applications": [{"name": "Ollama", "running_status": "running", "installation_found": True}],
                        }
                    ),
                    encoding="utf-8",
                )

                # Simulate transient server outage -> queued offline
                state.fail_next_scan_requests = 5
                res_queued = upload_scan_report(report_file, cfg)
                self.assertEqual(res_queued["status"], "queued_offline")
                self.assertTrue((tmp_path / "queue" / "SCN-E2E-001.json").exists())

                # Recover backend -> flush queue succeeds without duplicates
                state.fail_next_scan_requests = 0
                flushed = flush_pending_queue(cfg)
                self.assertEqual(flushed, ["SCN-E2E-001"])
                self.assertEqual(len(state.received_scans), 1)
                self.assertFalse((tmp_path / "queue" / "SCN-E2E-001.json").exists())
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
