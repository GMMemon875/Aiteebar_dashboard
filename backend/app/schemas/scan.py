from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class AIApplicationIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    publisher: str | None = Field(default=None, max_length=160)
    classification: Literal[
        "known_ai",
        "unknown_ai_candidate",
        "authorized_dev_tool",
        "normal_application",
    ] = "unknown_ai_candidate"
    running_status: Literal["running", "background", "not_running"] = "not_running"
    installation_found: bool = False
    executable_path: str | None = Field(default=None, max_length=512)
    registry_matched: bool = False


class MCPServerIn(BaseModel):
    server_name: str = Field(min_length=1, max_length=160)
    package_name: str = Field(min_length=1, max_length=255)
    package_version: str | None = Field(default=None, max_length=64)
    version_pinned: bool = False
    command: str | None = Field(default=None, max_length=128)
    redacted_arguments: list[str] = Field(default_factory=list)
    configuration_source: str = Field(min_length=1, max_length=512)
    risk_level: Literal["HIGH", "MEDIUM", "LOW"] = "LOW"


class RiskFindingIn(BaseModel):
    finding_code: str = Field(min_length=2, max_length=64)
    severity: Literal["HIGH", "MEDIUM", "LOW"]
    title: str = Field(min_length=2, max_length=255)
    description: str = Field(min_length=2)
    related_asset: str | None = Field(default=None, max_length=255)
    remediation: str = Field(min_length=2)
    detected_at: datetime | None = None


class ActivityEventIn(BaseModel):
    event_type: str = Field(min_length=2, max_length=64)
    resource_path: str | None = Field(default=None, max_length=512)
    responsible_process: str | None = Field(default=None, max_length=160)
    event_status: str = Field(default="normal", max_length=32)
    redacted_summary: str = Field(default="", max_length=1024)
    event_timestamp: datetime | None = None


class ScanSubmissionRequest(BaseModel):
    scan_id: str = Field(min_length=4, max_length=128)
    device_id: str = Field(min_length=3, max_length=64)
    device_name: str = Field(min_length=2, max_length=128)
    operating_system: str | None = Field(default=None, max_length=128)
    scanner_version: str = Field(min_length=1, max_length=32)
    scan_start_utc: datetime
    scan_status: Literal["success", "warning", "failed"] = "success"
    ai_applications: list[AIApplicationIn] = Field(default_factory=list)
    mcp_servers: list[MCPServerIn] = Field(default_factory=list)
    risk_findings: list[RiskFindingIn] = Field(default_factory=list)
    activity_events: list[ActivityEventIn] = Field(default_factory=list)
    raw_report: dict[str, Any] = Field(default_factory=dict)


class ScanIngestionResponse(BaseModel):
    status: Literal["created", "already_processed"]
    scan_id: str
    received_at: datetime


class AIApplicationOut(BaseModel):
    id: str
    scan_id: str
    device_id: str
    device_name: str
    name: str
    publisher: str | None
    classification: str
    review_status: str
    running_status: str
    installation_found: bool
    executable_path: str | None
    registry_matched: bool
    detected_at: datetime


class ApplicationReviewPatch(BaseModel):
    review_status: Literal[
        "pending_review", "approved", "flagged", "non_ai_verified"
    ]
    classification: (
        Literal[
            "known_ai",
            "unknown_ai_candidate",
            "authorized_dev_tool",
            "normal_application",
        ]
        | None
    ) = None


class MCPServerOut(BaseModel):
    id: str
    scan_id: str
    device_id: str
    device_name: str
    server_name: str
    package_name: str
    package_version: str | None
    version_pinned: bool
    command: str | None
    redacted_arguments: list[str]
    configuration_source: str
    risk_level: str
    inspection_only: bool = True
    detected_at: datetime


class RiskFindingOut(BaseModel):
    id: str
    finding_code: str
    scan_id: str
    device_id: str
    device_name: str
    severity: str
    title: str
    description: str
    related_asset: str | None
    remediation: str
    review_status: str
    reviewer_notes: str | None
    detected_at: datetime


class RiskReviewPatch(BaseModel):
    review_status: Literal["open", "in_review", "resolved", "accepted_risk"]
    reviewer_notes: str | None = Field(default=None, max_length=2000)


class ActivityEventOut(BaseModel):
    id: str
    device_id: str
    device_name: str
    event_type: str
    resource_path: str | None
    responsible_process: str | None
    event_status: str
    redacted_summary: str
    event_timestamp: datetime


class ScanSummaryOut(BaseModel):
    id: str
    scan_id: str
    device_id: str
    device_name: str
    scanner_version: str
    scan_start_utc: datetime
    received_at: datetime
    scan_status: str
    ai_applications_count: int
    mcp_servers_count: int
    risk_findings_count: int


class ScanDetailOut(ScanSummaryOut):
    report_json: dict[str, Any]
    ai_applications: list[AIApplicationOut]
    mcp_servers: list[MCPServerOut]
    risk_findings: list[RiskFindingOut]
