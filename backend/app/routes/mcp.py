from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.scan import MCPServer
from app.models.user import User
from app.schemas.scan import MCPServerOut
from app.security.dependencies import get_current_user

router = APIRouter()


@router.get("/mcp-servers", response_model=list[MCPServerOut])
def list_mcp_servers(
    device_id: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    search: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MCPServerOut]:
    q = db.query(MCPServer, Device.device_name).join(
        Device, MCPServer.device_id == Device.id
    )
    if device_id and device_id != "all":
        q = q.filter(MCPServer.device_id == device_id)
    if risk_level and risk_level != "all":
        q = q.filter(MCPServer.risk_level == risk_level)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (MCPServer.server_name.ilike(like))
            | (MCPServer.package_name.ilike(like))
            | (Device.device_name.ilike(like))
        )
    rows = q.order_by(MCPServer.detected_at.desc()).all()
    return [
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
        for m, dev_name in rows
    ]


@router.get("/mcp-servers/{server_id}", response_model=MCPServerOut)
def get_mcp_server(
    server_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MCPServerOut:
    row = (
        db.query(MCPServer, Device.device_name)
        .join(Device, MCPServer.device_id == Device.id)
        .filter(MCPServer.id == server_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="MCP server record not found."
        )
    m, dev_name = row
    return MCPServerOut(
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
