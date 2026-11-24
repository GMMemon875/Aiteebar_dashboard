from datetime import datetime
from pydantic import BaseModel, Field


class EnrollmentTokenCreateRequest(BaseModel):
    note: str = Field(default="", max_length=255)


class EnrollmentTokenResponse(BaseModel):
    token_id: str
    enrollment_token: str
    expires_at: datetime
    note: str


class DeviceEnrollRequest(BaseModel):
    enrollment_token: str = Field(min_length=8, max_length=256)
    device_id: str = Field(min_length=3, max_length=64)
    device_name: str = Field(min_length=2, max_length=128)
    operating_system: str = Field(min_length=2, max_length=128)
    scanner_version: str = Field(min_length=1, max_length=32)


class DeviceEnrollResponse(BaseModel):
    device_id: str
    device_name: str
    device_token: str
    token_expires_at: datetime


class DeviceOut(BaseModel):
    id: str
    device_name: str
    operating_system: str
    scanner_version: str
    device_status: str
    enrollment_status: str
    enrolled_at: datetime
    last_seen_at: datetime | None
    last_scan_status: str | None = None
    ai_apps_count: int = 0
    mcp_servers_count: int = 0
    open_risks_count: int = 0

    model_config = {"from_attributes": True}
