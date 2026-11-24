from datetime import datetime
from pydantic import BaseModel

from app.schemas.device import DeviceOut
from app.schemas.scan import (
    ActivityEventOut,
    AIApplicationOut,
    MCPServerOut,
    RiskFindingOut,
    ScanSummaryOut,
)


class DashboardSummaryOut(BaseModel):
    connected_devices: int
    total_devices: int
    ai_applications: int
    mcp_servers: int
    risk_findings: int
    high_risk_findings: int


class SecurityStatusOut(BaseModel):
    healthy_count: int
    attention_count: int
    critical_count: int
    healthy_pct: int
    attention_pct: int
    critical_pct: int
    total_evaluated: int
    calculation_rule: str


class RecentScanActivityOut(BaseModel):
    scan_id: str
    device_id: str
    device_name: str
    scan_time: datetime
    scan_status: str
    risk_findings_count: int


class RiskTrendPointOut(BaseModel):
    date: str
    high: int
    medium: int
    low: int


class DeviceDetailOut(BaseModel):
    device: DeviceOut
    ai_applications: list[AIApplicationOut]
    mcp_servers: list[MCPServerOut]
    risk_findings: list[RiskFindingOut]
    activity_events: list[ActivityEventOut]
    scans: list[ScanSummaryOut]


class SystemHealthOut(BaseModel):
    status: str
    database: str
    api_version: str
    recommended_scanner_version: str
    timestamp_utc: datetime


class AuditLogOut(BaseModel):
    id: str
    actor_email: str
    action: str
    target_type: str
    target_id: str | None
    details: str
    created_at: datetime

    model_config = {"from_attributes": True}
