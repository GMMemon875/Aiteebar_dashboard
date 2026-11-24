from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummaryOut,
    RecentScanActivityOut,
    RiskTrendPointOut,
    SecurityStatusOut,
)
from app.security.dependencies import get_current_user
from app.services.dashboard_service import (
    get_dashboard_summary,
    get_recent_activity,
    get_risk_trends,
    get_security_status,
)

router = APIRouter()


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardSummaryOut:
    return get_dashboard_summary(db)


@router.get("/dashboard/security-status", response_model=SecurityStatusOut)
def dashboard_security_status(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SecurityStatusOut:
    return get_security_status(db)


@router.get("/dashboard/recent-activity", response_model=list[RecentScanActivityOut])
def dashboard_recent_activity(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RecentScanActivityOut]:
    return get_recent_activity(db)


@router.get("/dashboard/risk-trends", response_model=list[RiskTrendPointOut])
def dashboard_risk_trends(
    days: int = Query(default=7, ge=1, le=90),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RiskTrendPointOut]:
    return get_risk_trends(db, days=days)
