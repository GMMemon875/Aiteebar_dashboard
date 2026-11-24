from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.device import Device, DeviceToken, EnrollmentToken
from app.models.scan import (
    ActivityEvent,
    AIApplication,
    MCPServer,
    RiskFinding,
    Scan,
)
from app.models.user import User
from app.schemas.dashboard import DeviceDetailOut
from app.schemas.device import (
    DeviceEnrollRequest,
    DeviceEnrollResponse,
    DeviceOut,
    EnrollmentTokenCreateRequest,
    EnrollmentTokenResponse,
)
from app.schemas.scan import (
    ActivityEventOut,
    AIApplicationOut,
    MCPServerOut,
    RiskFindingOut,
    ScanSummaryOut,
)
from app.security.dependencies import get_current_user, require_admin
from app.security.device_auth import (
    generate_device_token,
    generate_enrollment_token,
    hash_token,
)
from app.security.rate_limit import limit_by_ip
from app.services.audit_service import record_audit_log

router = APIRouter()
settings = get_settings()


@router.post(
    "/devices/enrollment-tokens",
    response_model=EnrollmentTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_enrollment_token(
    payload: EnrollmentTokenCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> EnrollmentTokenResponse:
    raw_token = generate_enrollment_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    row = EnrollmentToken(
        token_hash=hash_token(raw_token),
        issued_by_user_id=admin.id,
        note=payload.note,
        expires_at=expires_at,
    )
    db.add(row)
    db.flush()
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="ENROLLMENT_TOKEN_ISSUED",
        target_type="enrollment_token",
        target_id=row.id,
        details=payload.note or "Issued 15-minute one-time enrollment token",
    )
    db.commit()
    return EnrollmentTokenResponse(
        token_id=row.id,
        enrollment_token=raw_token,
        expires_at=expires_at,
        note="Single-use enrollment token. Copy now; it cannot be viewed again.",
    )


@router.post(
    "/devices/enroll",
    response_model=DeviceEnrollResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_by_ip("enroll", settings.rate_limit_enroll_per_minute))],
)
def enroll_device(
    payload: DeviceEnrollRequest,
    db: Session = Depends(get_db),
) -> DeviceEnrollResponse:
    now = datetime.now(timezone.utc)
    enr_hash = hash_token(payload.enrollment_token)
    enr_row = (
        db.query(EnrollmentToken)
        .filter(EnrollmentToken.token_hash == enr_hash)
        .first()
    )
    if not enr_row or enr_row.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Enrollment token is invalid or has already been used.",
        )

    exp = (
        enr_row.expires_at
        if enr_row.expires_at.tzinfo
        else enr_row.expires_at.replace(tzinfo=timezone.utc)
    )
    if exp < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Enrollment token has expired.",
        )

    device = db.query(Device).filter(Device.id == payload.device_id).first()
    if not device:
        device = Device(
            id=payload.device_id,
            device_name=payload.device_name,
            operating_system=payload.operating_system,
            scanner_version=payload.scanner_version,
            device_status="online",
            enrollment_status="enrolled",
            enrolled_at=now,
            last_seen_at=now,
        )
        db.add(device)
    else:
        device.device_name = payload.device_name
        device.operating_system = payload.operating_system
        device.scanner_version = payload.scanner_version
        device.device_status = "online"
        device.enrollment_status = "enrolled"
        device.last_seen_at = now
        # Revoke any previously active tokens on re-enrollment
        (
            db.query(DeviceToken)
            .filter(DeviceToken.device_id == device.id, DeviceToken.revoked_at.is_(None))
            .update({"revoked_at": now})
        )

    raw_device_token = generate_device_token()
    token_expires = now + timedelta(days=365)
    db.add(
        DeviceToken(
            device_id=device.id,
            token_hash=hash_token(raw_device_token),
            expires_at=token_expires,
        )
    )

    enr_row.used_at = now
    enr_row.used_by_device_id = device.id

    db.commit()
    return DeviceEnrollResponse(
        device_id=device.id,
        device_name=device.device_name,
        device_token=raw_device_token,
        token_expires_at=token_expires,
    )


@router.get("/devices", response_model=list[DeviceOut])
def list_devices(
    search: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DeviceOut]:
    q = db.query(Device)
    if status_filter and status_filter != "all":
        q = q.filter(Device.device_status == status_filter)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (Device.device_name.ilike(like))
            | (Device.id.ilike(like))
            | (Device.operating_system.ilike(like))
        )
    devices = q.order_by(Device.device_name.asc()).all()
    results: list[DeviceOut] = []
    for dev in devices:
        latest_scan = (
            db.query(Scan)
            .filter(Scan.device_id == dev.id)
            .order_by(Scan.received_at.desc())
            .first()
        )
        open_risks = (
            db.query(RiskFinding)
            .filter(RiskFinding.device_id == dev.id, RiskFinding.review_status != "resolved")
            .count()
        )
        ai_cnt = (
            db.query(AIApplication)
            .filter(AIApplication.scan_id == latest_scan.scan_id)
            .count()
            if latest_scan
            else 0
        )
        mcp_cnt = (
            db.query(MCPServer)
            .filter(MCPServer.scan_id == latest_scan.scan_id)
            .count()
            if latest_scan
            else 0
        )
        results.append(
            DeviceOut(
                id=dev.id,
                device_name=dev.device_name,
                operating_system=dev.operating_system,
                scanner_version=dev.scanner_version,
                device_status=dev.device_status,
                enrollment_status=dev.enrollment_status,
                enrolled_at=dev.enrolled_at,
                last_seen_at=dev.last_seen_at,
                last_scan_status=latest_scan.scan_status if latest_scan else None,
                ai_apps_count=ai_cnt,
                mcp_servers_count=mcp_cnt,
                open_risks_count=open_risks,
            )
        )
    return results


@router.get("/devices/{device_id}", response_model=DeviceDetailOut)
def get_device_detail(
    device_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeviceDetailOut:
    dev = db.query(Device).filter(Device.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    scans = (
        db.query(Scan)
        .filter(Scan.device_id == dev.id)
        .order_by(Scan.received_at.desc())
        .all()
    )
    apps = (
        db.query(AIApplication)
        .filter(AIApplication.device_id == dev.id)
        .order_by(AIApplication.detected_at.desc())
        .all()
    )
    mcps = (
        db.query(MCPServer)
        .filter(MCPServer.device_id == dev.id)
        .order_by(MCPServer.detected_at.desc())
        .all()
    )
    risks = (
        db.query(RiskFinding)
        .filter(RiskFinding.device_id == dev.id)
        .order_by(RiskFinding.detected_at.desc())
        .all()
    )
    events = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.device_id == dev.id)
        .order_by(ActivityEvent.event_timestamp.desc())
        .limit(50)
        .all()
    )

    scan_summaries: list[ScanSummaryOut] = []
    for s in scans:
        scan_summaries.append(
            ScanSummaryOut(
                id=s.id,
                scan_id=s.scan_id,
                device_id=s.device_id,
                device_name=dev.device_name,
                scanner_version=s.scanner_version,
                scan_start_utc=s.scan_start_utc,
                received_at=s.received_at,
                scan_status=s.scan_status,
                ai_applications_count=db.query(AIApplication).filter(AIApplication.scan_id == s.scan_id).count(),
                mcp_servers_count=db.query(MCPServer).filter(MCPServer.scan_id == s.scan_id).count(),
                risk_findings_count=db.query(RiskFinding).filter(RiskFinding.scan_id == s.scan_id).count(),
            )
        )

    return DeviceDetailOut(
        device=DeviceOut.model_validate(dev),
        ai_applications=[
            AIApplicationOut(
                id=a.id,
                scan_id=a.scan_id,
                device_id=a.device_id,
                device_name=dev.device_name,
                name=a.name,
                publisher=a.publisher,
                classification=a.classification,
                review_status=a.review_status,
                running_status=a.running_status,
                installation_found=a.installation_found,
                executable_path=a.executable_path,
                registry_matched=a.registry_matched,
                detected_at=a.detected_at,
            )
            for a in apps
        ],
        mcp_servers=[
            MCPServerOut(
                id=m.id,
                scan_id=m.scan_id,
                device_id=m.device_id,
                device_name=dev.device_name,
                server_name=m.server_name,
                package_name=m.package_name,
                package_version=m.package_version,
                version_pinned=m.version_pinned,
                command=m.command,
                redacted_arguments=m.redacted_arguments or [],
                configuration_source=m.configuration_source,
                risk_level=m.risk_level,
                inspection_only=True,
                detected_at=m.detected_at,
            )
            for m in mcps
        ],
        risk_findings=[
            RiskFindingOut(
                id=r.id,
                finding_code=r.finding_code,
                scan_id=r.scan_id,
                device_id=r.device_id,
                device_name=dev.device_name,
                severity=r.severity,
                title=r.title,
                description=r.description,
                related_asset=r.related_asset,
                remediation=r.remediation,
                review_status=r.review_status,
                reviewer_notes=r.reviewer_notes,
                detected_at=r.detected_at,
            )
            for r in risks
        ],
        activity_events=[
            ActivityEventOut(
                id=ev.id,
                device_id=ev.device_id,
                device_name=dev.device_name,
                event_type=ev.event_type,
                resource_path=ev.resource_path,
                responsible_process=ev.responsible_process,
                event_status=ev.event_status,
                redacted_summary=ev.redacted_summary,
                event_timestamp=ev.event_timestamp,
            )
            for ev in events
        ],
        scans=scan_summaries,
    )


@router.get("/devices/{device_id}/scans", response_model=list[ScanSummaryOut])
def get_device_scans(
    device_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScanSummaryOut]:
    dev = db.query(Device).filter(Device.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")
    scans = (
        db.query(Scan)
        .filter(Scan.device_id == device_id)
        .order_by(Scan.received_at.desc())
        .all()
    )
    return [
        ScanSummaryOut(
            id=s.id,
            scan_id=s.scan_id,
            device_id=s.device_id,
            device_name=dev.device_name,
            scanner_version=s.scanner_version,
            scan_start_utc=s.scan_start_utc,
            received_at=s.received_at,
            scan_status=s.scan_status,
            ai_applications_count=db.query(AIApplication).filter(AIApplication.scan_id == s.scan_id).count(),
            mcp_servers_count=db.query(MCPServer).filter(MCPServer.scan_id == s.scan_id).count(),
            risk_findings_count=db.query(RiskFinding).filter(RiskFinding.scan_id == s.scan_id).count(),
        )
        for s in scans
    ]


@router.post("/devices/{device_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
def revoke_device(
    device_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    dev = db.query(Device).filter(Device.id == device_id).first()
    if not dev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")
    now = datetime.now(timezone.utc)
    dev.enrollment_status = "revoked"
    dev.device_status = "offline"
    (
        db.query(DeviceToken)
        .filter(DeviceToken.device_id == device_id, DeviceToken.revoked_at.is_(None))
        .update({"revoked_at": now})
    )
    record_audit_log(
        db,
        actor_user_id=admin.id,
        actor_email=admin.email,
        action="DEVICE_TOKEN_REVOKED",
        target_type="device",
        target_id=device_id,
        details=f"Revoked enrollment and active tokens for {dev.device_name}",
    )
    db.commit()
