"""Initial Aiteebar PostgreSQL Schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def json_type():
    return sa.JSON().with_variant(postgresql.JSONB(astext_type=sa.Text()), "postgresql")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "devices",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("device_name", sa.String(length=128), nullable=False),
        sa.Column("operating_system", sa.String(length=128), nullable=False),
        sa.Column("scanner_version", sa.String(length=32), nullable=False),
        sa.Column("device_status", sa.String(length=32), nullable=False),
        sa.Column("enrollment_status", sa.String(length=32), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_devices_device_name", "devices", ["device_name"])
    op.create_index("ix_devices_device_status", "devices", ["device_status"])
    op.create_index("ix_devices_last_seen_at", "devices", ["last_seen_at"])

    op.create_table(
        "application_registry",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("publisher", sa.String(length=160), nullable=True),
        sa.Column("process_names", json_type(), nullable=False),
        sa.Column("installation_paths", json_type(), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", sa.String(length=64), nullable=True),
        sa.Column("actor_email", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=128), nullable=True),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_actor_created", "audit_logs", ["actor_email", "created_at"])

    op.create_table(
        "enrollment_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("issued_by_user_id", sa.String(length=64), nullable=True),
        sa.Column("note", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("used_by_device_id", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )

    op.create_table(
        "device_tokens",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_device_tokens_device_revoked", "device_tokens", ["device_id", "revoked_at"])

    op.create_table(
        "scans",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("scan_id", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("scanner_version", sa.String(length=32), nullable=False),
        sa.Column("scan_start_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scan_status", sa.String(length=32), nullable=False),
        sa.Column("report_json", json_type(), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_id"),
    )
    op.create_index("ix_scans_device_received", "scans", ["device_id", "received_at"])

    op.create_table(
        "ai_applications",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("scan_id", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("publisher", sa.String(length=160), nullable=True),
        sa.Column("classification", sa.String(length=64), nullable=False),
        sa.Column("review_status", sa.String(length=32), nullable=False),
        sa.Column("running_status", sa.String(length=32), nullable=False),
        sa.Column("installation_found", sa.Boolean(), nullable=False),
        sa.Column("executable_path", sa.String(length=512), nullable=True),
        sa.Column("registry_matched", sa.Boolean(), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.scan_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "mcp_servers",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("scan_id", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("server_name", sa.String(length=160), nullable=False),
        sa.Column("package_name", sa.String(length=255), nullable=False),
        sa.Column("package_version", sa.String(length=64), nullable=True),
        sa.Column("version_pinned", sa.Boolean(), nullable=False),
        sa.Column("command", sa.String(length=128), nullable=True),
        sa.Column("redacted_arguments", json_type(), nullable=False),
        sa.Column("configuration_source", sa.String(length=512), nullable=False),
        sa.Column("risk_level", sa.String(length=16), nullable=False),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.scan_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "risk_findings",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("finding_code", sa.String(length=64), nullable=False),
        sa.Column("scan_id", sa.String(length=128), nullable=False),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("related_asset", sa.String(length=255), nullable=True),
        sa.Column("remediation", sa.Text(), nullable=False),
        sa.Column("review_status", sa.String(length=32), nullable=False),
        sa.Column("reviewer_notes", sa.Text(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.scan_id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "activity_events",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("scan_id", sa.String(length=128), nullable=True),
        sa.Column("device_id", sa.String(length=64), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("resource_path", sa.String(length=512), nullable=True),
        sa.Column("responsible_process", sa.String(length=160), nullable=True),
        sa.Column("event_status", sa.String(length=32), nullable=False),
        sa.Column("redacted_summary", sa.Text(), nullable=False),
        sa.Column("event_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.scan_id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("activity_events")
    op.drop_table("risk_findings")
    op.drop_table("mcp_servers")
    op.drop_table("ai_applications")
    op.drop_table("scans")
    op.drop_table("device_tokens")
    op.drop_table("enrollment_tokens")
    op.drop_table("audit_logs")
    op.drop_table("application_registry")
    op.drop_table("devices")
    op.drop_table("users")
