from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.scan import ActivityEvent
from app.models.user import User
from app.schemas.scan import ActivityEventOut
from app.security.dependencies import get_current_user

router = APIRouter()


@router.get("/activity-events", response_model=list[ActivityEventOut])
def list_activity_events(
    device_id: str | None = Query(default=None),
    event_type: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ActivityEventOut]:
    q = db.query(ActivityEvent, Device.device_name).join(
        Device, ActivityEvent.device_id == Device.id
    )
    if device_id and device_id != "all":
        q = q.filter(ActivityEvent.device_id == device_id)
    if event_type and event_type != "all":
        q = q.filter(ActivityEvent.event_type == event_type)
    if date_from:
        dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        q = q.filter(ActivityEvent.event_timestamp >= dt_from)
    if date_to:
        dt_to = datetime.fromisoformat(date_to).replace(
            hour=23, minute=59, second=59, tzinfo=timezone.utc
        )
        q = q.filter(ActivityEvent.event_timestamp <= dt_to)

    rows = q.order_by(ActivityEvent.event_timestamp.desc()).limit(250).all()
    return [
        ActivityEventOut(
            id=ev.id,
            device_id=ev.device_id,
            device_name=dev_name,
            event_type=ev.event_type,
            resource_path=ev.resource_path,
            responsible_process=ev.responsible_process,
            event_status=ev.event_status,
            redacted_summary=ev.redacted_summary,
            event_timestamp=ev.event_timestamp,
        )
        for ev, dev_name in rows
    ]
