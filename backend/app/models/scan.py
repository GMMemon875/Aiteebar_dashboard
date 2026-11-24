from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


JsonType = JSON().with_variant(JSONB(), "postgresql")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    scan_id: Mapped[str] = mapped_column(
        String(128), nullable=False, unique=True, index=True
    )
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scanner_version: Mapped[str] = mapped_column(String(32), nullable=False)
    scan_start_utc: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )
    scan_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="success", index=True
    )
    report_json: Mapped[dict] = mapped_column(JsonType, nullable=False)

    device: Mapped["Device"] = relationship(back_populates="scans")
    ai_applications: Mapped[list["AIApplication"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )
    mcp_servers: Mapped[list["MCPServer"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )
    risk_findings: Mapped[list["RiskFinding"]] = relationship(
        back_populates="scan", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_scans_device_received", "device_id", "received_at"),
    )


class AIApplication(Base):
    __tablename__ = "ai_applications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    scan_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    publisher: Mapped[str | None] = mapped_column(String(160), nullable=True)
    classification: Mapped[str] = mapped_column(
        String(64), nullable=False, default="unknown_ai_candidate", index=True
    )
    review_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending_review", index=True
    )
    running_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="not_running", index=True
    )
    installation_found: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    executable_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    registry_matched: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    scan: Mapped["Scan"] = relationship(back_populates="ai_applications")


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    scan_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    server_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    package_name: Mapped[str] = mapped_column(String(255), nullable=False)
    package_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    version_pinned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    command: Mapped[str | None] = mapped_column(String(128), nullable=True)
    redacted_arguments: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    configuration_source: Mapped[str] = mapped_column(String(512), nullable=False)
    risk_level: Mapped[str] = mapped_column(
        String(16), nullable=False, default="LOW", index=True
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    scan: Mapped["Scan"] = relationship(back_populates="mcp_servers")


class RiskFinding(Base):
    __tablename__ = "risk_findings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    finding_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    scan_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("scans.scan_id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    related_asset: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remediation: Mapped[str] = mapped_column(Text, nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="open", index=True
    )
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )

    scan: Mapped["Scan"] = relationship(back_populates="risk_findings")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    scan_id: Mapped[str | None] = mapped_column(
        String(128), ForeignKey("scans.scan_id", ondelete="SET NULL"), nullable=True
    )
    device_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    resource_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    responsible_process: Mapped[str | None] = mapped_column(String(160), nullable=True)
    event_status: Mapped[str] = mapped_column(String(32), nullable=False, default="normal")
    redacted_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )
