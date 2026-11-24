from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.device import Device
from app.models.scan import AIApplication, MCPServer, RiskFinding, Scan
from app.models.user import User
from app.schemas.scan import (
    AIApplicationOut,
    MCPServerOut,
    RiskFindingOut,
    ScanDetailOut,
    ScanIngestionResponse,
    ScanSubmissionRequest,
    ScanSummaryOut,
)
from app.security.dependencies import get_authenticated_device, get_current_user
from app.security.rate_limit import limit_by_ip
from app.services.scan_service import ingest_scan_report

router = APIRouter()
settings = get_settings()


@router.post(
    "/scans",
    response_model=ScanIngestionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_by_ip("scans", settings.rate_limit_scans_per_minute))],
)
def submit_scan(
    payload: ScanSubmissionRequest,
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db),
) -> ScanIngestionResponse:
    return ingest_scan_report(db, authenticated_device=device, payload=payload)


@router.get("/scans", response_model=list[ScanSummaryOut])
def list_scans(
    device_id: str | None = Query(default=None),
    scan_status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ScanSummaryOut]:
    q = db.query(Scan, Device.device_name).join(Device, Scan.device_id == Device.id)
    if device_id and device_id != "all":
        q = q.filter(Scan.device_id == device_id)
    if scan_status and scan_status != "all":
        q = q.filter(Scan.scan_status == scan_status)
    if search:
        like = f"%{search}%"
        q = q.filter((Scan.scan_id.ilike(like)) | (Device.device_name.ilike(like)))
    rows = q.order_by(Scan.received_at.desc()).all()
    return [
        ScanSummaryOut(
            id=scan.id,
            scan_id=scan.scan_id,
            device_id=scan.device_id,
            device_name=dev_name,
            scanner_version=scan.scanner_version,
            scan_start_utc=scan.scan_start_utc,
            received_at=scan.received_at,
            scan_status=scan.scan_status,
            ai_applications_count=db.query(AIApplication).filter(AIApplication.scan_id == scan.scan_id).count(),
            mcp_servers_count=db.query(MCPServer).filter(MCPServer.scan_id == scan.scan_id).count(),
            risk_findings_count=db.query(RiskFinding).filter(RiskFinding.scan_id == scan.scan_id).count(),
        )
        for scan, dev_name in rows
    ]


@router.get("/scans/{scan_id}", response_model=ScanDetailOut)
def get_scan_detail(
    scan_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScanDetailOut:
    row = (
        db.query(Scan, Device.device_name)
        .join(Device, Scan.device_id == Device.id)
        .filter(Scan.scan_id == scan_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    scan, dev_name = row
    apps = db.query(AIApplication).filter(AIApplication.scan_id == scan.scan_id).all()
    mcps = db.query(MCPServer).filter(MCPServer.scan_id == scan.scan_id).all()
    risks = db.query(RiskFinding).filter(RiskFinding.scan_id == scan.scan_id).all()
    return ScanDetailOut(
        id=scan.id,
        scan_id=scan.scan_id,
        device_id=scan.device_id,
        device_name=dev_name,
        scanner_version=scan.scanner_version,
        scan_start_utc=scan.scan_start_utc,
        received_at=scan.received_at,
        scan_status=scan.scan_status,
        ai_applications_count=len(apps),
        mcp_servers_count=len(mcps),
        risk_findings_count=len(risks),
        report_json=scan.report_json,
        ai_applications=[
            AIApplicationOut(
                id=a.id,
                scan_id=a.scan_id,
                device_id=a.device_id,
                device_name=dev_name,
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
                device_name=dev_name,
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
                device_name=dev_name,
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
    )


@router.get("/scans/{scan_id}/report")
def get_scan_raw_report(
    scan_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    scan = db.query(Scan).filter(Scan.scan_id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan report not found.")
    return scan.report_json
