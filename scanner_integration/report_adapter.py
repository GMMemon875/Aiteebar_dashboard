# """Adapter layer between local Aiteebar scan_report.json and FastAPI /api/v1/scans."""

# from __future__ import annotations

# from datetime import datetime, timezone
# import hashlib
# import os
# import platform
# import re
# import socket
# from typing import Any

# SENSITIVE_KEY_RE = re.compile(
#     r"(token|secret|password|passwd|api[_-]?key|credential|auth|bearer|clipboard|document_content|raw_text)",
#     re.IGNORECASE,
# )

# SECRET_VALUE_PATTERNS = [
#     re.compile(r"(sk-[A-Za-z0-9_-]{12,})"),
#     re.compile(r"(ghp_[A-Za-z0-9]{12,})"),
#     re.compile(r"(AIza[0-9A-Za-z_-]{20,})"),
#     re.compile(r"(postgres(?:ql)?://[^:\s]+:)([^@\s]+)(@)", re.IGNORECASE),
#     re.compile(r"(--?(?:token|api-key|password|secret)\s*[= ]\s*)(\S+)", re.IGNORECASE),
# ]


# def redact_text(value: str) -> str:
#     result = value
#     for pattern in SECRET_VALUE_PATTERNS:
#         if pattern.groups == 3:
#             result = pattern.sub(r"\1[REDACTED]\3", result)
#         elif pattern.groups == 2:
#             result = pattern.sub(r"\1[REDACTED]", result)
#         else:
#             result = pattern.sub("[REDACTED]", result)
#     return result


# def sanitize_dict(obj: Any) -> Any:
#     if isinstance(obj, dict):
#         cleaned: dict[str, Any] = {}
#         for k, v in obj.items():
#             key_s = str(k)
#             if SENSITIVE_KEY_RE.search(key_s) and not key_s.endswith("_count"):
#                 cleaned[key_s] = "[REDACTED]"
#             else:
#                 cleaned[key_s] = sanitize_dict(v)
#         return cleaned
#     if isinstance(obj, list):
#         return [sanitize_dict(item) for item in obj]
#     if isinstance(obj, str):
#         return redact_text(obj)
#     return obj

#  def _normalize_running_status(raw: dict[str, Any]) -> str:
#     val = str(raw.get("running_status") or raw.get("status") or "").lower().strip()

#     if val in {"running", "background", "not_running"}:
#         return val

#     if val == "not running":
#         return "not_running"

#     if raw.get("running") is True or raw.get("is_running") is True:
#         return "running"

#     if raw.get("is_background") is True:
#         return "background"

#     return "not_running"

# def _normalize_classification(raw: dict[str, Any]) -> str:
#     val = str(raw.get("classification") or "").lower().strip()
#     if val in {
#         "known_ai",
#         "unknown_ai_candidate",
#         "authorized_dev_tool",
#         "normal_application",
#     }:
#         return val
#     if raw.get("is_known_ai") is True or raw.get("registry_matched") is True:
#         return "known_ai"
#     return "unknown_ai_candidate"

# def _normalize_severity(raw_sev: Any) -> str:
#     sev = str(raw_sev or "LOW").upper().strip()
#     if sev in {"HIGH", "CRITICAL"}:
#         return "HIGH"
#     if sev in {"MEDIUM", "WARN", "WARNING"}:
#         return "MEDIUM"
#     return "LOW"

# def adapt_scan_report(
#     report: dict[str, Any],
#     *,
#     device_id: str,
#     device_name: str | None = None,
# ) -> dict[str, Any]:
#     """
#     Adapt an existing scan_report.json structure into the FastAPI /api/v1/scans schema
#     without requiring changes to aiteebar_mini_scanner.py.
#     """
#     sanitized_raw = sanitize_dict(report)

#     hostname = (
#         device_name
#         or str(sanitized_raw.get("device_name") or sanitized_raw.get("hostname") or socket.gethostname())
#     )
#     os_name = str(
#         sanitized_raw.get("operating_system")
#         or sanitized_raw.get("os")
#         or f"{platform.system()} {platform.release()}"
#     )
#      scanner_version = str(
#     sanitized_raw.get("version")
#     or sanitized_raw.get("scanner_version")
#     or "0.3"
# )
#     scan_start_utc = str(
#         sanitized_raw.get("scan_start_utc")
#         or sanitized_raw.get("timestamp_utc")
#         or datetime.now(timezone.utc).isoformat()
#     )

#     scan_id = sanitized_raw.get("scan_id")
#     if not scan_id:
#         digest = hashlib.sha256(
#             f"{device_id}:{scan_start_utc}:{hostname}".encode("utf-8")
#         ).hexdigest()[:12]
#         scan_id = f"SCN-{digest.upper()}"

#     raw_apps = (
#     sanitized_raw.get("apps")
#     or sanitized_raw.get("ai_applications")
#     or sanitized_raw.get("discovered_applications")
#     or sanitized_raw.get("applications")
#     or []
#     )
#     adapted_apps: list[dict[str, Any]] = []
#     for app in raw_apps:
#         if not isinstance(app, dict):
#             continue
#         adapted_apps.append(
#             {
#                 "name": str(app.get("name") or app.get("app_name") or "Unknown Application"),
#                 "publisher": app.get("publisher"),
#                 "classification": _normalize_classification(app),
#                 "running_status": _normalize_running_status(app),
#                 "installation_found": bool(
#                     app.get("installation_found", app.get("installed", False))
#                 ),
#                  "executable_path": (
#                     app.get("executable_path")
#                    or app.get("path")
#                    or (
#                        app.get("installation_paths_found", [None])[0]
#                        if isinstance(app.get("installation_paths_found"), list)
#                        else None
#              )
#                 ),
#                 "registry_matched": bool(app.get("registry_matched", False)),
#             }
#         )
#     mcp_scan = sanitized_raw.get("mcp_config_scan")

#         raw_mcps = (
#     sanitized_raw.get("mcp_servers")
#     or sanitized_raw.get("mcp_configurations")
#     or (
#         mcp_scan.get("servers", [])
#         if isinstance(mcp_scan, dict)
#         else []
#     )
# )
#     adapted_mcps: list[dict[str, Any]] = []
#     for mcp in raw_mcps:
#         if not isinstance(mcp, dict):
#             continue
#         args = mcp.get("redacted_arguments") or mcp.get("args") or []
#         if not isinstance(args, list):
#             args = [str(args)]
#         adapted_mcps.append(
#             {
#                 "server_name": str(mcp.get("server_name") or mcp.get("name") or "unnamed-mcp"),
#                 "package_name": str(mcp.get("package_name") or mcp.get("package") or "unknown-package"),
#                 "package_version": mcp.get("package_version") or mcp.get("version"),
#                 "version_pinned": bool(mcp.get("version_pinned", False)),
#                 "command": mcp.get("command"),
#                 "redacted_arguments": [redact_text(str(a)) for a in args],
#                  "configuration_source": (
#                           str(
#                    mcp.get("configuration_source")
#                    or mcp.get("source")
#                   or (
#                    mcp_scan.get("config_path")
#                     if isinstance(mcp_scan, dict)
#                        else None
#                       )
#                        or "unknown"
#                        ).replace("\\", "/").rsplit("/", 1)[-1]
# ),
#                 "risk_level": _normalize_severity(mcp.get("risk_level") or mcp.get("severity")),
#             }
#         )

#     raw_risks = (
#         sanitized_raw.get("risk_findings")
#         or sanitized_raw.get("findings")
#         or sanitized_raw.get("risks")
#         or []
#     )
#     adapted_risks: list[dict[str, Any]] = []
#     for idx, r in enumerate(raw_risks):
#         if not isinstance(r, dict):
#             continue
#         adapted_risks.append(
#             {
#                 "finding_code": str(r.get("finding_code") or r.get("rule_id") or f"RULE-{idx+1:03d}"),
#                 "severity": _normalize_severity(r.get("severity")),
#                 "title": str(r.get("title") or "Security Finding"),
#                 "description": str(r.get("description") or "Detected by local scanner rule."),
#                 "related_asset": r.get("related_asset") or r.get("asset"),
#                 "remediation": str(r.get("remediation") or "Review endpoint configuration."),
#                 "detected_at": r.get("detected_at"),
#             }
#         )

#     raw_events = sanitized_raw.get("activity_events") or []
#     adapted_events: list[dict[str, Any]] = []
#     for ev in raw_events:
#         if not isinstance(ev, dict):
#             continue
#         adapted_events.append(
#             {
#                 "event_type": str(ev.get("event_type") or "FILE_ACTIVITY"),
#                 "resource_path": ev.get("resource_path") or ev.get("path"),
#                 "responsible_process": ev.get("responsible_process") or ev.get("process"),
#                 "event_status": str(ev.get("event_status") or "logged_redacted"),
#                 "redacted_summary": str(
#                     ev.get("redacted_summary")
#                     or ev.get("summary")
#                     or "Redacted metadata event"
#                 ),
#                 "event_timestamp": ev.get("event_timestamp") or ev.get("timestamp"),
#             }
#         )

#                  scan_status = str(
#                 sanitized_raw.get("scan_status")
#                 or sanitized_raw.get("status")
#                       or ""
#                 ).lower().strip()

# if scan_status == "completed":
#     scan_status = "success"

# if scan_status not in {"success", "warning", "failed"}:
#     scan_status = "warning" if adapted_risks else "success"
#     return {
#         "scan_id": str(scan_id),
#         "device_id": device_id,
#         "device_name": hostname,
#         "operating_system": os_name,
#         "scanner_version": scanner_version,
#         "scan_start_utc": scan_start_utc,
#         "scan_status": scan_status,
#         "ai_applications": adapted_apps,
#         "mcp_servers": adapted_mcps,
#         "risk_findings": adapted_risks,
#         "activity_events": adapted_events,
#         "raw_report": sanitized_raw,
#     }

# def load_device_id_default() -> str:
#     env_id = os.getenv("AITEEBAR_DEVICE_ID", "").strip()
#     if env_id:
#         return env_id
#     host = socket.gethostname().upper()
#     suffix = hashlib.sha256(host.encode("utf-8")).hexdigest()[:6].upper()
#     return f"DEV-WIN-{suffix}"


"""Adapter layer between local Aiteebar scan_report.json and FastAPI /api/v1/scans."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import os
import platform
import re
import socket
from typing import Any


SENSITIVE_KEY_RE = re.compile(
    r"(token|secret|password|passwd|api[_-]?key|credential|auth|bearer|clipboard|document_content|raw_text)",
    re.IGNORECASE,
)

SECRET_VALUE_PATTERNS = [
    re.compile(r"(sk-[A-Za-z0-9_-]{12,})"),
    re.compile(r"(ghp_[A-Za-z0-9]{12,})"),
    re.compile(r"(AIza[0-9A-Za-z_-]{20,})"),
    re.compile(
        r"(postgres(?:ql)?://[^:\s]+:)([^@\s]+)(@)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(--?(?:token|api-key|password|secret)\s*[= ]\s*)(\S+)",
        re.IGNORECASE,
    ),
]


def redact_text(value: str) -> str:
    result = value

    for pattern in SECRET_VALUE_PATTERNS:
        if pattern.groups == 3:
            result = pattern.sub(r"\1[REDACTED]\3", result)
        elif pattern.groups == 2:
            result = pattern.sub(r"\1[REDACTED]", result)
        else:
            result = pattern.sub("[REDACTED]", result)

    return result


def sanitize_dict(obj: Any) -> Any:
    if isinstance(obj, dict):
        cleaned: dict[str, Any] = {}

        for k, v in obj.items():
            key_s = str(k)

            if SENSITIVE_KEY_RE.search(key_s) and not key_s.endswith("_count"):
                cleaned[key_s] = "[REDACTED]"
            else:
                cleaned[key_s] = sanitize_dict(v)

        return cleaned

    if isinstance(obj, list):
        return [sanitize_dict(item) for item in obj]

    if isinstance(obj, str):
        return redact_text(obj)

    return obj

    return obj


def sanitize_local_paths(obj: Any, parent_key: str = "") -> Any:
    if isinstance(obj, dict):
        return {
            str(key): sanitize_local_paths(value, str(key).lower())
            for key, value in obj.items()
        }

    if isinstance(obj, list):
        return [
            sanitize_local_paths(item, parent_key)
            for item in obj
        ]

    if isinstance(obj, str):
        path_keys = {
            "config_path",
            "configuration_path",
            "installation_path",
            "installation_location",
            "executable_path",
            "path",
            "display_icon",
        }

        if (
            parent_key in path_keys
            or parent_key.endswith("_paths_found")
            or parent_key.endswith("_locations")
        ):
            return obj.replace("\\", "/").rsplit("/", 1)[-1]

    return obj


def _normalize_running_status(raw: dict[str, Any]) -> str:
    val = str(
        raw.get("running_status") or raw.get("status") or ""
    ).lower().strip()

    if val in {"running", "background", "not_running"}:
        return val

    if val == "not running":
        return "not_running"

    if raw.get("running") is True or raw.get("is_running") is True:
        return "running"

    if raw.get("is_background") is True:
        return "background"

    return "not_running"


def _normalize_classification(raw: dict[str, Any]) -> str:
    val = str(raw.get("classification") or "").lower().strip()

    if val in {
        "known_ai",
        "unknown_ai_candidate",
        "authorized_dev_tool",
        "normal_application",
    }:
        return val

    if raw.get("is_known_ai") is True or raw.get("registry_matched") is True:
        return "known_ai"

    return "unknown_ai_candidate"


def _normalize_severity(raw_sev: Any) -> str:
    sev = str(raw_sev or "LOW").upper().strip()

    if sev in {"HIGH", "CRITICAL"}:
        return "HIGH"

    if sev in {"MEDIUM", "WARN", "WARNING"}:
        return "MEDIUM"

    return "LOW"


def adapt_scan_report(
    report: dict[str, Any],
    *,
    device_id: str,
    device_name: str | None = None,
) -> dict[str, Any]:
    """
    Adapt an existing scan_report.json structure into the FastAPI
    /api/v1/scans schema without changing the local scanner.
    """

    sanitized_raw = sanitize_dict(report)

    hostname = (
        device_name
        or str(
            sanitized_raw.get("device_name")
            or sanitized_raw.get("hostname")
            or socket.gethostname()
        )
    )

    os_name = str(
        sanitized_raw.get("operating_system")
        or sanitized_raw.get("os")
        or f"{platform.system()} {platform.release()}"
    )

    scanner_version = str(
        sanitized_raw.get("version")
        or sanitized_raw.get("scanner_version")
        or "0.3"
    )

    scan_start_utc = str(
        sanitized_raw.get("scan_start_utc")
        or sanitized_raw.get("timestamp_utc")
        or datetime.now(timezone.utc).isoformat()
    )

    scan_id = sanitized_raw.get("scan_id")

    if not scan_id:
        digest = hashlib.sha256(
            f"{device_id}:{scan_start_utc}:{hostname}".encode("utf-8")
        ).hexdigest()[:12]

        scan_id = f"SCN-{digest.upper()}"

    # AI application discovery
    raw_apps = (
        sanitized_raw.get("apps")
        or sanitized_raw.get("ai_applications")
        or sanitized_raw.get("discovered_applications")
        or sanitized_raw.get("applications")
        or []
    )

    adapted_apps: list[dict[str, Any]] = []

    for app in raw_apps:
        if not isinstance(app, dict):
            continue

        executable_path = (
            app.get("executable_path")
            or app.get("path")
        )

        if not executable_path:
            installation_paths = app.get("installation_paths_found")

            if isinstance(installation_paths, list) and installation_paths:
                executable_path = installation_paths[0]

        # Keep only the filename, not the full Windows user path.
        if executable_path:
            executable_path = (
                str(executable_path)
                .replace("\\", "/")
                .rsplit("/", 1)[-1]
            )

        adapted_apps.append(
            {
                "name": str(
                    app.get("name")
                    or app.get("app_name")
                    or "Unknown Application"
                ),
                "publisher": app.get("publisher"),
                "classification": _normalize_classification(app),
                "running_status": _normalize_running_status(app),
                "installation_found": bool(
                    app.get("installation_found", app.get("installed", False))
                ),
                "executable_path": executable_path,
                "registry_matched": bool(
                    app.get("registry_matched", False)
                ),
            }
        )

    # MCP configuration inspection
    mcp_scan = sanitized_raw.get("mcp_config_scan")

    raw_mcps = (
        sanitized_raw.get("mcp_servers")
        or sanitized_raw.get("mcp_configurations")
        or (
            mcp_scan.get("servers", [])
            if isinstance(mcp_scan, dict)
            else []
        )
    )

    adapted_mcps: list[dict[str, Any]] = []

    for mcp in raw_mcps:
        if not isinstance(mcp, dict):
            continue

        args = (
            mcp.get("redacted_arguments")
            or mcp.get("args")
            or []
        )

        if not isinstance(args, list):
            args = [str(args)]

        config_source = (
            mcp.get("configuration_source")
            or mcp.get("source")
            or (
                mcp_scan.get("config_path")
                if isinstance(mcp_scan, dict)
                else None
            )
            or "unknown"
        )

        # Keep only the configuration filename.
        config_source = (
            str(config_source)
            .replace("\\", "/")
            .rsplit("/", 1)[-1]
        )

        adapted_mcps.append(
            {
                "server_name": str(
                    mcp.get("server_name")
                    or mcp.get("name")
                    or "unnamed-mcp"
                ),
                "package_name": str(
                    mcp.get("package_name")
                    or mcp.get("package")
                    or "unknown-package"
                ),
                "package_version": (
                    mcp.get("package_version")
                    or mcp.get("version")
                ),
                "version_pinned": bool(
                    mcp.get("version_pinned", False)
                ),
                "command": mcp.get("command"),
                "redacted_arguments": [
                    redact_text(str(arg)) for arg in args
                ],
                "configuration_source": config_source,
                "risk_level": _normalize_severity(
                    mcp.get("risk_level") or mcp.get("severity")
                ),
            }
        )

    # Risk findings
    raw_risks = (
        sanitized_raw.get("risk_findings")
        or sanitized_raw.get("findings")
        or sanitized_raw.get("risks")
        or []
    )

    adapted_risks: list[dict[str, Any]] = []

    for idx, finding in enumerate(raw_risks):
        if not isinstance(finding, dict):
            continue

        adapted_risks.append(
            {
                "finding_code": str(
                    finding.get("finding_code")
                    or finding.get("rule_id")
                    or f"RULE-{idx + 1:03d}"
                ),
                "severity": _normalize_severity(
                    finding.get("severity")
                ),
                "title": str(
                    finding.get("title") or "Security Finding"
                ),
                "description": str(
                    finding.get("description")
                    or "Detected by local scanner rule."
                ),
                "related_asset": (
                    finding.get("related_asset")
                    or finding.get("asset")
                ),
                "remediation": str(
                    finding.get("remediation")
                    or "Review endpoint configuration."
                ),
                "detected_at": finding.get("detected_at"),
            }
        )

    # Activity events
    raw_events = sanitized_raw.get("activity_events") or []
    adapted_events: list[dict[str, Any]] = []

    for event in raw_events:
        if not isinstance(event, dict):
            continue

        adapted_events.append(
            {
                "event_type": str(
                    event.get("event_type") or "FILE_ACTIVITY"
                ),
                "resource_path": (
                    event.get("resource_path") or event.get("path")
                ),
                "responsible_process": (
                    event.get("responsible_process")
                    or event.get("process")
                ),
                "event_status": str(
                    event.get("event_status") or "logged_redacted"
                ),
                "redacted_summary": str(
                    event.get("redacted_summary")
                    or event.get("summary")
                    or "Redacted metadata event"
                ),
                "event_timestamp": (
                    event.get("event_timestamp")
                    or event.get("timestamp")
                ),
            }
        )

    # Backend accepts only success, warning, or failed.
    scan_status = str(
        sanitized_raw.get("scan_status")
        or sanitized_raw.get("status")
        or ""
    ).lower().strip()

    if scan_status == "completed":
        scan_status = "success"

    if scan_status not in {"success", "warning", "failed"}:
        scan_status = "warning" if adapted_risks else "success"

    return {
        "scan_id": str(scan_id),
        "device_id": device_id,
        "device_name": hostname,
        "operating_system": os_name,
        "scanner_version": scanner_version,
        "scan_start_utc": scan_start_utc,
        "scan_status": scan_status,
        "ai_applications": adapted_apps,
        "mcp_servers": adapted_mcps,
        "risk_findings": adapted_risks,
        "activity_events": adapted_events,
        "raw_report": sanitize_local_paths(sanitized_raw),
    }


def load_device_id_default() -> str:
    env_id = os.getenv("AITEEBAR_DEVICE_ID", "").strip()

    if env_id:
        return env_id

    host = socket.gethostname().upper()
    suffix = hashlib.sha256(host.encode("utf-8")).hexdigest()[:6].upper()

    return f"DEV-WIN-{suffix}"
