from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.device import Device
from app.models.scan import AIApplication, MCPServer, RiskFinding, Scan
from app.schemas.dashboard import (
    DashboardSummaryOut,
    RecentScanActivityOut,
    RiskTrendPointOut,
    SecurityStatusOut,
)

SECURITY_CALCULATION_RULE = (
    "Critical: >=1 unresolved HIGH risk; Attention: unresolved MEDIUM/LOW risk or "
    "device stale/offline; Healthy: online with 0 unresolved risks."
)


def _latest_scan_ids_by_device(db: Session) -> list[str]:
    subq = (
        db.query(
            Scan.device_id,
            func.max(Scan.received_at).label("max_received"),
        )
        .group_by(Scan.device_id)
        .subquery()
    )
    rows = (
        db.query(Scan.scan_id)
        .join(
            subq,
            (Scan.device_id == subq.c.device_id)
            & (Scan.received_at == subq.c.max_received),
        )
        .all()
    )
    return [r[0] for r in rows]


def get_dashboard_summary(db: Session) -> DashboardSummaryOut:
    total_devices = db.query(Device).filter(Device.enrollment_status != "revoked").count()
    connected_devices = (
        db.query(Device)
        .filter(Device.enrollment_status != "revoked", Device.device_status == "online")
        .count()
    )
    latest_scan_ids = _latest_scan_ids_by_device(db)
    if latest_scan_ids:
        ai_apps = (
            db.query(AIApplication)
            .filter(AIApplication.scan_id.in_(latest_scan_ids))
            .count()
        )
        mcp_servers = (
            db.query(MCPServer)
            .filter(MCPServer.scan_id.in_(latest_scan_ids))
            .count()
        )
    else:
        ai_apps = 0
        mcp_servers = 0

    open_risks_q = db.query(RiskFinding).filter(RiskFinding.review_status != "resolved")
    risk_findings = open_risks_q.count()
    high_risk_findings = open_risks_q.filter(RiskFinding.severity == "HIGH").count()

    return DashboardSummaryOut(
        connected_devices=connected_devices,
        total_devices=total_devices,
        ai_applications=ai_apps,
        mcp_servers=mcp_servers,
        risk_findings=risk_findings,
        high_risk_findings=high_risk_findings,
    )


def get_security_status(db: Session) -> SecurityStatusOut:
    devices = db.query(Device).filter(Device.enrollment_status != "revoked").all()
    if not devices:
        return SecurityStatusOut(
            healthy_count=0,
            attention_count=0,
            critical_count=0,
            healthy_pct=0,
            attention_pct=0,
            critical_pct=0,
            total_evaluated=0,
            calculation_rule=SECURITY_CALCULATION_RULE,
        )

    unresolved_risks = (
        db.query(RiskFinding)
        .filter(RiskFinding.review_status != "resolved")
        .all()
    )
    risks_by_device: dict[str, list[RiskFinding]] = defaultdict(list)
    for r in unresolved_risks:
        risks_by_device[r.device_id].append(r)

    healthy = 0
    attention = 0
    critical = 0

    for dev in devices:
        dev_risks = risks_by_device.get(dev.id, [])
        if any(r.severity == "HIGH" for r in dev_risks):
            critical += 1
        elif dev_risks or dev.device_status != "online":
            attention += 1
        else:
            healthy += 1

    total = len(devices)
    return SecurityStatusOut(
        healthy_count=healthy,
        attention_count=attention,
        critical_count=critical,
        healthy_pct=round((healthy / total) * 100),
        attention_pct=round((attention / total) * 100),
        critical_pct=round((critical / total) * 100),
        total_evaluated=total,
        calculation_rule=SECURITY_CALCULATION_RULE,
    )


def get_recent_activity(db: Session, limit: int = 8) -> list[RecentScanActivityOut]:
    scans = (
        db.query(Scan, Device.device_name)
        .join(Device, Scan.device_id == Device.id)
        .order_by(Scan.received_at.desc())
        .limit(limit)
        .all()
    )
    results: list[RecentScanActivityOut] = []
    for scan, device_name in scans:
        risk_cnt = (
            db.query(RiskFinding)
            .filter(RiskFinding.scan_id == scan.scan_id)
            .count()
        )
        results.append(
            RecentScanActivityOut(
                scan_id=scan.scan_id,
                device_id=scan.device_id,
                device_name=device_name,
                scan_time=scan.received_at,
                scan_status=scan.scan_status,
                risk_findings_count=risk_cnt,
            )
        )
    return results


def get_risk_trends(db: Session, days: int = 7) -> list[RiskTrendPointOut]:
    days = max(1, min(days, 90))
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days - 1)).date()

    counts: dict[str, dict[str, int]] = {}
    for offset in range(days):
        d_str = (start_date + timedelta(days=offset)).isoformat()
        counts[d_str] = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}

    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    findings = (
        db.query(RiskFinding)
        .filter(RiskFinding.detected_at >= start_dt)
        .all()
    )
    for f in findings:
        day_key = f.detected_at.date().isoformat()
        if day_key in counts and f.severity in counts[day_key]:
            counts[day_key][f.severity] += 1

    return [
        RiskTrendPointOut(
            date=d_str,
            high=counts[d_str]["HIGH"],
            medium=counts[d_str]["MEDIUM"],
            low=counts[d_str]["LOW"],
        )
        for d_str in sorted(counts.keys())
    ]
