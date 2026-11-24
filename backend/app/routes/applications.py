from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.device import Device
from app.models.scan import AIApplication
from app.models.user import User
from app.schemas.scan import AIApplicationOut, ApplicationReviewPatch
from app.security.dependencies import get_current_user, require_analyst_or_admin
from app.services.audit_service import record_audit_log

router = APIRouter()


@router.get("/applications", response_model=list[AIApplicationOut])
def list_applications(
    search: str | None = Query(default=None),
    device_id: str | None = Query(default=None),
    classification: str | None = Query(default=None),
    running_status: str | None = Query(default=None),
    review_status: str | None = Query(default=None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AIApplicationOut]:
    q = db.query(AIApplication, Device.device_name).join(
        Device, AIApplication.device_id == Device.id
    )
    if device_id and device_id != "all":
        q = q.filter(AIApplication.device_id == device_id)
    if classification and classification != "all":
        q = q.filter(AIApplication.classification == classification)
    if running_status and running_status != "all":
        q = q.filter(AIApplication.running_status == running_status)
    if review_status and review_status != "all":
        q = q.filter(AIApplication.review_status == review_status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (AIApplication.name.ilike(like))
            | (Device.device_name.ilike(like))
            | (AIApplication.publisher.ilike(like))
        )
    rows = q.order_by(AIApplication.detected_at.desc()).all()
    return [
        AIApplicationOut(
            id=a.id,
            scan_id=a.scan_id,
            device_id=a.device_id,
            device_name=dev_name,
            name=a.name,
            publisher=a.publisher,
            classification=a.classification,
            review_status=a.review_status,
            running_status=a.running_status,
            installation_found=a.installation_found,
            executable_path=a.executable_path,
            registry_matched=a.registry_matched,
            detected_at=a.detected_at,
        )
        for a, dev_name in rows
    ]


@router.get("/applications/{application_id}", response_model=AIApplicationOut)
def get_application(
    application_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AIApplicationOut:
    row = (
        db.query(AIApplication, Device.device_name)
        .join(Device, AIApplication.device_id == Device.id)
        .filter(AIApplication.id == application_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found."
        )
    a, dev_name = row
    return AIApplicationOut(
        id=a.id,
        scan_id=a.scan_id,
        device_id=a.device_id,
        device_name=dev_name,
        name=a.name,
        publisher=a.publisher,
        classification=a.classification,
        review_status=a.review_status,
        running_status=a.running_status,
        installation_found=a.installation_found,
        executable_path=a.executable_path,
        registry_matched=a.registry_matched,
        detected_at=a.detected_at,
    )


@router.patch("/applications/{application_id}", response_model=AIApplicationOut)
def review_application(
    application_id: str,
    payload: ApplicationReviewPatch,
    reviewer: User = Depends(require_analyst_or_admin),
    db: Session = Depends(get_db),
) -> AIApplicationOut:
    row = (
        db.query(AIApplication, Device.device_name)
        .join(Device, AIApplication.device_id == Device.id)
        .filter(AIApplication.id == application_id)
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found."
        )
    app_obj, dev_name = row
    app_obj.review_status = payload.review_status
    if payload.classification is not None:
        app_obj.classification = payload.classification

    record_audit_log(
        db,
        actor_user_id=reviewer.id,
        actor_email=reviewer.email,
        action="APPLICATION_REVIEWED",
        target_type="ai_application",
        target_id=app_obj.id,
        details=f"Set review_status={app_obj.review_status}, classification={app_obj.classification}",
    )
    db.commit()
    db.refresh(app_obj)
    return AIApplicationOut(
        id=app_obj.id,
        scan_id=app_obj.scan_id,
        device_id=app_obj.device_id,
        device_name=dev_name,
        name=app_obj.name,
        publisher=app_obj.publisher,
        classification=app_obj.classification,
        review_status=app_obj.review_status,
        running_status=app_obj.running_status,
        installation_found=app_obj.installation_found,
        executable_path=app_obj.executable_path,
        registry_matched=app_obj.registry_matched,
        detected_at=app_obj.detected_at,
    )
