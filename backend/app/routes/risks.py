from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.scan import RiskFinding
from app.models.user import User
from app.schemas.scan import RiskFindingOut, RiskReviewPatch
from app.security.dependencies import get_current_user, require_analyst_or_admin
from app.services.audit_service import record_audit_log

router = APIRouter()


@router.get("/risks", response_model=list[RiskFindingOut])
def list_risks(
    severity: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
    review_status: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RiskFindingOut]:
    q = db.query(RiskFinding, Device.device_name).join(
        Device, RiskFinding.device_id == Device.id
    )
    if severity and severity != "all":
        q = q.filter(RiskFinding.severity == severity)
    if device_id and device_id != "all":
        q = q.filter(RiskFinding.device_id == device_id)
    if review_status and review_status != "all":
        q = q.filter(RiskFinding.review_status == review_status)
    if date_from:
        dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        q = q.filter(RiskFinding.detected_at >= dt_from)
    if date_to:
        dt_to = datetime.fromisoformat(date_to).replace(
            hour=23, minute=59, second=59, tzinfo=timezone.utc
        )
        q = q.filter(RiskFinding.detected_at <= dt_to)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (RiskFinding.title.ilike(like))
            | (RiskFinding.finding_code.ilike(like))
            | (Device.device_name.ilike(like))
        )

    rows = q.order_by(RiskFinding.detected_at.desc()).all()
    return [
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
        for r, dev_name in rows
    ]


@router.get("/risks/{finding_id}", response_model=RiskFindingOut)
def get_risk_detail(
    finding_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskFindingOut:
    row = (
        db.query(RiskFinding, Device.device_name)
        .join(Device, RiskFinding.device_id == Device.id)
        .filter(RiskFinding.id == finding_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Risk finding not found."
        )
    r, dev_name = row
    return RiskFindingOut(
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


@router.patch("/risks/{finding_id}", response_model=RiskFindingOut)
def update_risk_review(
    finding_id: str,
    payload: RiskReviewPatch,
    reviewer: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> RiskFindingOut:
    row = (
        db.query(RiskFinding, Device.device_name)
        .join(Device, RiskFinding.device_id == Device.id)
        .filter(RiskFinding.id == finding_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Risk finding not found."
        )
    finding, dev_name = row
    finding.review_status = payload.review_status
    if payload.reviewer_notes is not None:
        finding.reviewer_notes = payload.reviewer_notes

    record_audit_log(
        db,
        actor_user_id=reviewer.id,
        actor_email=reviewer.email,
        action="RISK_STATUS_UPDATED",
        target_type="risk_finding",
        target_id=finding.id,
        details=f"Set review_status={finding.review_status}",
    )
    db.commit()
    db.refresh(finding)
    return RiskFindingOut(
        id=finding.id,
        finding_code=finding.finding_code,
        scan_id=finding.scan_id,
        device_id=finding.device_id,
        device_name=dev_name,
        severity=finding.severity,
        title=finding.title,
        description=finding.description,
        related_asset=finding.related_asset,
        remediation=finding.remediation,
        review_status=finding.review_status,
        reviewer_notes=finding.reviewer_notes,
        detected_at=finding.detected_at,
    )
