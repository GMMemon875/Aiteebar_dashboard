from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.registry import ApplicationRegistry
from app.models.scan import (
    ActivityEvent,
    AIApplication,
    MCPServer,
    RiskFinding,
    Scan,
)
from app.schemas.scan import ScanIngestionResponse, ScanSubmissionRequest
from app.security.redaction import redact_arguments, redact_string, sanitize_report_payload


def ingest_scan_report(
    db: Session,
    *,
    authenticated_device: Device,
    payload: ScanSubmissionRequest,
) -> ScanIngestionResponse:
    if payload.device_id != authenticated_device.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device token does not match payload device_id.",
        )

    existing = db.query(Scan).filter(Scan.scan_id == payload.scan_id).first()
    if existing:
        if existing.device_id != authenticated_device.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="scan_id is already registered to another device.",
            )
        return ScanIngestionResponse(
            status="already_processed",
            scan_id=existing.scan_id,
            received_at=existing.received_at,
        )

    now = datetime.now(timezone.utc)
    authenticated_device.device_name = payload.device_name
    if payload.operating_system:
        authenticated_device.operating_system = payload.operating_system
    authenticated_device.scanner_version = payload.scanner_version
    authenticated_device.device_status = "online"
    authenticated_device.last_seen_at = now

    preserved_json = sanitize_report_payload(
        payload.raw_report if payload.raw_report else payload.model_dump(mode="json")
    )

    scan = Scan(
        scan_id=payload.scan_id,
        device_id=authenticated_device.id,
        scanner_version=payload.scanner_version,
        scan_start_utc=payload.scan_start_utc,
        received_at=now,
        scan_status=payload.scan_status,
        report_json=preserved_json,
    )
    db.add(scan)
    db.flush()

    enabled_registry_names = {
        r.name.lower()
        for r in db.query(ApplicationRegistry)
        .filter(ApplicationRegistry.is_enabled.is_(True))
        .all()
    }

    for app_in in payload.ai_applications:
        matched = app_in.registry_matched or (app_in.name.lower() in enabled_registry_names)
        review_status = "approved" if matched else "pending_review"
        db.add(
            AIApplication(
                scan_id=scan.scan_id,
                device_id=authenticated_device.id,
                name=app_in.name,
                publisher=app_in.publisher,
                classification=app_in.classification,
                review_status=review_status,
                running_status=app_in.running_status,
                installation_found=app_in.installation_found,
                executable_path=redact_string(app_in.executable_path)
                if app_in.executable_path
                else None,
                registry_matched=matched,
                detected_at=now,
            )
        )

    for mcp_in in payload.mcp_servers:
        db.add(
            MCPServer(
                scan_id=scan.scan_id,
                device_id=authenticated_device.id,
                server_name=mcp_in.server_name,
                package_name=mcp_in.package_name,
                package_version=mcp_in.package_version,
                version_pinned=mcp_in.version_pinned,
                command=mcp_in.command,
                redacted_arguments=redact_arguments(mcp_in.redacted_arguments),
                configuration_source=redact_string(mcp_in.configuration_source),
                risk_level=mcp_in.risk_level,
                detected_at=now,
            )
        )

    for risk_in in payload.risk_findings:
        db.add(
            RiskFinding(
                finding_code=risk_in.finding_code,
                scan_id=scan.scan_id,
                device_id=authenticated_device.id,
                severity=risk_in.severity,
                title=risk_in.title,
                description=redact_string(risk_in.description),
                related_asset=risk_in.related_asset,
                remediation=risk_in.remediation,
                review_status="open",
                detected_at=risk_in.detected_at or now,
            )
        )

    for ev_in in payload.activity_events:
        db.add(
            ActivityEvent(
                scan_id=scan.scan_id,
                device_id=authenticated_device.id,
                event_type=ev_in.event_type,
                resource_path=redact_string(ev_in.resource_path)
                if ev_in.resource_path
                else None,
                responsible_process=ev_in.responsible_process,
                event_status=ev_in.event_status,
                redacted_summary=redact_string(ev_in.redacted_summary),
                event_timestamp=ev_in.event_timestamp or now,
            )
        )

    db.commit()
    return ScanIngestionResponse(
        status="created",
        scan_id=scan.scan_id,
        received_at=now,
    )
