from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import AuditLog, User
from app.schemas.dashboard import AuditLogOut, SystemHealthOut
from app.security.dependencies import require_admin

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=SystemHealthOut)
def system_health(db: Session = Depends(get_db)) -> SystemHealthOut:
    db_status = "connected"
    overall = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"
        overall = "degraded"

    return SystemHealthOut(
        status=overall,
        database=db_status,
        api_version="v1",
        recommended_scanner_version=settings.recommended_scanner_version,
        timestamp_utc=datetime.now(timezone.utc),
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
def list_audit_logs(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AuditLogOut]:
    rows = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(100)
        .all()
    )
    return [AuditLogOut.model_validate(r) for r in rows]
